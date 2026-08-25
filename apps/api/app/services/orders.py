from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Cart, Order, OrderItem, OrderStatus
from app.schemas import CheckoutIn, QuoteRequest
from app.services import quote as quote_service
from app.utils import normalize_phone

logger = logging.getLogger(__name__)


class QuoteChanged(Exception):
    def __init__(self, message: str, new_total: int):
        super().__init__(message)
        self.new_total = new_total


async def next_public_number(db: AsyncSession) -> str:
    count = await db.scalar(select(Order.id))
    stamp = datetime.now(timezone.utc).strftime("%y%m%d")
    suffix = uuid.uuid4().hex[:4].upper()
    _ = count
    return f"KD-{stamp}-{suffix}"


async def create_order(db: AsyncSession, cart: Cart, payload: CheckoutIn) -> Order:
    existing = await db.scalar(select(Order).where(Order.idempotency_key == payload.idempotency_key))
    if existing:
        return existing

    cart_full = await db.scalar(select(Cart).options(selectinload(Cart.items)).where(Cart.id == cart.id))
    if not cart_full:
        raise ValueError("Корзина не найдена")

    if not cart_full.items:
        order = Order(
            public_number=await next_public_number(db),
            status=OrderStatus.new,
            customer_name=payload.name.strip(),
            phone=normalize_phone(payload.phone) or payload.phone,
            comment=payload.comment.strip(),
            total_snapshot=0,
            cart_id=cart.id,
            idempotency_key=payload.idempotency_key,
        )
        db.add(order)
        await db.flush()
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=None,
                title=payload.comment.strip() or "Заявка без состава корзины",
                quantity=1,
                unit_price=0,
                line_total=0,
                config_json={},
            )
        )
        await db.flush()
        return order

    fresh_total = 0
    snapshots: list[tuple] = []
    for item in cart_full.items:
        cfg = QuoteRequest.model_validate(item.config_json)
        quoted = await quote_service.quote(db, cfg)
        if quoted.total != item.quoted_total:
            item.quoted_total = quoted.total
            raise QuoteChanged("Цены изменились, обновите корзину", quoted.total)
        fresh_total += quoted.total
        snapshots.append((item, quoted))

    order = Order(
        public_number=await next_public_number(db),
        status=OrderStatus.new,
        customer_name=payload.name.strip(),
        phone=normalize_phone(payload.phone) or payload.phone,
        comment=payload.comment.strip(),
        total_snapshot=fresh_total,
        cart_id=cart.id,
        idempotency_key=payload.idempotency_key,
    )
    db.add(order)
    await db.flush()

    for item, quoted in snapshots:
        for line in quoted.lines:
            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=line.product_id,
                    title=line.title,
                    quantity=max(1, int(round(line.quantity))),
                    unit_price=line.unit_price,
                    line_total=line.line_total,
                    config_json=item.config_json,
                )
            )
    await db.flush()
    for item in list(cart_full.items):
        await db.delete(item)
    return order
