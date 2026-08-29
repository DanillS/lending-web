from __future__ import annotations

import asyncio
import base64
import json
import logging
from datetime import timezone
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Order, PushSubscription, SiteSetting
from app.schemas import PushSubscribeIn

logger = logging.getLogger(__name__)
settings = get_settings()
VAPID_SETTING = "vapid"


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _vapid_subject() -> str:
    if settings.vapid_subject:
        return settings.vapid_subject
    if settings.site_url.startswith("https://"):
        return settings.site_url.rstrip("/")
    return f"mailto:{settings.admin_email}"


def generate_vapid_keys() -> dict[str, str]:
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization

    key = ec.generate_private_key(ec.SECP256R1())
    private_bytes = key.private_numbers().private_value.to_bytes(32, "big")
    public_bytes = key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    return {"public": _b64url(public_bytes), "private": _b64url(private_bytes), "subject": _vapid_subject()}


async def load_vapid(db: AsyncSession) -> dict[str, str]:
    if settings.vapid_public_key and settings.vapid_private_key:
        return {
            "public": settings.vapid_public_key,
            "private": settings.vapid_private_key,
            "subject": _vapid_subject(),
        }
    row = await db.scalar(select(SiteSetting).where(SiteSetting.key == VAPID_SETTING))
    if row and row.value.get("public") and row.value.get("private"):
        data = dict(row.value)
        data.setdefault("subject", _vapid_subject())
        return data
    keys = generate_vapid_keys()
    if row:
        row.value = keys
    else:
        db.add(SiteSetting(key=VAPID_SETTING, value=keys))
    await db.flush()
    return keys


def order_push_payload(order: Order) -> dict[str, str]:
    created = getattr(order, "created_at", None)
    when = ""
    if created is not None:
        if getattr(created, "tzinfo", None) is None:
            created = created.replace(tzinfo=timezone.utc)
        when = created.astimezone(ZoneInfo("Europe/Moscow")).strftime("%d.%m %H:%M")
    parts = [when, f"{order.customer_name}, {order.phone}, {order.total_snapshot} ₽"]
    return {
        "title": f"Новая заявка {order.public_number}",
        "body": " · ".join(part for part in parts if part),
        "url": "/admin/orders",
    }


async def subscribe(db: AsyncSession, user_id: UUID, payload: PushSubscribeIn, user_agent: str | None) -> None:
    existing = await db.scalar(select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint))
    ua = (user_agent or "")[:400] or None
    if existing:
        existing.user_id = user_id
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.user_agent = ua
        return
    db.add(
        PushSubscription(
            id=uuid4(),
            user_id=user_id,
            endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh,
            auth=payload.keys.auth,
            user_agent=ua,
        )
    )


async def unsubscribe(db: AsyncSession, user_id: UUID, endpoint: str) -> None:
    row = await db.scalar(select(PushSubscription).where(PushSubscription.endpoint == endpoint))
    if row and row.user_id == user_id:
        await db.delete(row)


def _deliver(sub: PushSubscription, payload: str, vapid: dict[str, str]) -> int | None:
    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=payload,
            vapid_private_key=vapid["private"],
            vapid_claims={"sub": vapid["subject"]},
        )
        return None
    except WebPushException as exc:
        status = exc.response.status_code if exc.response is not None else None
        logger.warning("Web push failed: %s", exc)
        return status if status is not None else 599
    except Exception:
        logger.exception("Web push send failed")
        return 598


async def send_json(db: AsyncSession, payload: dict, user_id: UUID | None = None) -> int:
    vapid = await load_vapid(db)
    query = select(PushSubscription)
    if user_id:
        query = query.where(PushSubscription.user_id == user_id)
    rows = list((await db.scalars(query)).all())
    if not rows:
        return 0
    body = json.dumps(payload, ensure_ascii=False)
    sent = 0
    for row in rows:
        status = await asyncio.to_thread(_deliver, row, body, vapid)
        if status in {404, 410}:
            await db.delete(row)
        elif status is None:
            sent += 1
    await db.flush()
    return sent


async def notify_new_order(db: AsyncSession, order: Order) -> None:
    await send_json(db, order_push_payload(order))


async def send_test(db: AsyncSession, user_id: UUID) -> int:
    count = await send_json(
        db,
        {"title": "Админка", "body": "Уведомления включены. Новые заявки придут сюда.", "url": "/admin/orders"},
        user_id=user_id,
    )
    if count == 0:
        raise HTTPException(status_code=400, detail="Нет подписок. Сначала включите уведомления в этом браузере.")
    return count
