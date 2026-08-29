from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, File, HTTPException, Query, Request, Response, UploadFile
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.db import get_db
from app.models import Order, OrderStatus, Product, ProductImage, ProductType, User
from app.schemas import (
    BulkApplyOut,
    BulkPreviewOut,
    BulkPriceIn,
    LastBatchOut,
    LoginIn,
    UndoIn,
    OrderOut,
    OrderStatusIn,
    ProductCardOut,
    ProductListOut,
    ProductWrite,
    PushSubscribeIn,
    PushUnsubscribeIn,
)
from app.security import (
    REFRESH_COOKIE,
    clear_auth_cookies,
    decode_token,
    get_current_user,
    set_auth_cookies,
    verify_password,
)
from app.services import cache, catalog, prices, push
from app.utils import slugify


def _spec_columns(specs: dict | None) -> dict:
    specs = specs or {}
    return {
        "brand": specs.get("Производитель"),
        "manufacturer": specs.get("Производитель"),
        "covering": specs.get("Покрытие"),
        "glass_type": specs.get("Вид стекла"),
        "style": specs.get("Стиль оформления"),
        "opening_system": specs.get("Система открывания"),
    }


router = APIRouter(prefix="/api/v1/admin", tags=["admin"])
settings = get_settings()
MIME_EXT = {
    "image/webp": ".webp",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/pjpeg": ".jpg",
    "image/png": ".png",
    "image/x-png": ".png",
}


def _image_ext(content_type: str | None, content: bytes) -> str:
    mime = (content_type or "").lower().split(";")[0].strip()
    if mime in MIME_EXT:
        return MIME_EXT[mime]
    if content[:3] == b"\xff\xd8\xff":
        return ".jpg"
    if content[:8] == b"\x89PNG\r\n\x1a\n":
        return ".png"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return ".webp"
    raise HTTPException(status_code=400, detail="Только webp, jpeg, png")


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if forwarded:
        return forwarded
    return request.client.host if request.client else "unknown"


@router.post("/login")
async def login(payload: LoginIn, request: Request, response: Response, db: AsyncSession = Depends(get_db)) -> dict:
    ip = _client_ip(request)
    if await cache.rate_limited(f"login:{ip}", limit=10, window_sec=900):
        raise HTTPException(status_code=429, detail="Слишком много попыток входа, подождите")
    user = await db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    set_auth_cookies(response, user.id)
    return {"email": user.email, "role": user.role.value}


@router.post("/logout")
async def logout(response: Response) -> dict:
    clear_auth_cookies(response)
    return {"ok": True}


@router.post("/refresh")
async def refresh(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(alias=REFRESH_COOKIE, default=None),
) -> dict:
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Нужна авторизация")
    user_id = decode_token(refresh_token)
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    set_auth_cookies(response, user.id)
    return {"email": user.email, "role": user.role.value}


@router.get("/me")
async def me(user: Annotated[User, Depends(get_current_user)]) -> dict:
    return {"email": user.email, "role": user.role.value}


@router.get("/products", response_model=ProductListOut)
async def admin_products(
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    q: str | None = None,
    type: ProductType | None = None,
) -> ProductListOut:
    items, total = await catalog.list_products(
        db, page=page, page_size=page_size, q=q, product_type=type, active_only=False
    )
    return ProductListOut(
        items=[ProductCardOut.model_validate(i) for i in items], total=total, page=page, page_size=page_size
    )


@router.post("/products", response_model=ProductCardOut)
async def create_product(
    payload: ProductWrite,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> ProductCardOut:
    slug = payload.slug or slugify(payload.name)
    sku = payload.sku or f"SKU-{uuid.uuid4().hex[:8].upper()}"
    cols = _spec_columns(payload.specs)
    product = Product(
        sku=sku,
        slug=slug,
        type=payload.type,
        name=payload.name,
        series=payload.series,
        description=payload.description,
        brand=payload.brand or cols["brand"],
        manufacturer=payload.manufacturer or cols["manufacturer"],
        category=payload.category,
        covering=payload.covering or cols["covering"],
        glass_type=payload.glass_type or cols["glass_type"],
        style=payload.style or cols["style"],
        opening_system=payload.opening_system or cols["opening_system"],
        specs=payload.specs,
        base_price=payload.base_price,
        current_price=payload.current_price if payload.current_price is not None else payload.base_price,
        old_price=payload.old_price,
        popular=payload.popular,
        is_active=payload.is_active,
        seo_title=payload.seo_title or f"{payload.name} — купить в Казани",
        seo_description=payload.seo_description,
    )
    db.add(product)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Товар с таким названием или артикулом уже есть")
    except Exception:
        await db.rollback()
        raise
    product = await catalog.get_by_id(db, product.id)
    return ProductCardOut.model_validate(product)


@router.get("/products/{product_id}", response_model=ProductCardOut)
async def get_product(
    product_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> ProductCardOut:
    product = await catalog.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Не найдено")
    return ProductCardOut.model_validate(product)


@router.put("/products/{product_id}", response_model=ProductCardOut)
async def update_product(
    product_id: UUID,
    payload: ProductWrite,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> ProductCardOut:
    product = await catalog.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Не найдено")
    data = payload.model_dump(exclude_unset=True)
    if data.get("slug") is None:
        data.pop("slug", None)
    if data.get("sku") is None:
        data.pop("sku", None)
    if data.get("current_price") is None:
        data.pop("current_price", None)
    for key, value in data.items():
        setattr(product, key, value)
    if "specs" in data:
        cols = _spec_columns(product.specs)
        for key, value in cols.items():
            if key not in data or data.get(key) is None:
                setattr(product, key, value)
    await db.commit()
    product = await catalog.get_by_id(db, product_id)
    return ProductCardOut.model_validate(product)


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    product = await catalog.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Не найдено")
    product.deleted_at = datetime.now(timezone.utc)
    product.is_active = False
    await db.commit()
    return {"ok": True}


@router.post("/products/{product_id}/images")
async def upload_image(
    product_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
    file: UploadFile = File(...),
) -> dict:
    product = await catalog.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Не найдено")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл больше 5 МБ")
    ext = _image_ext(file.content_type, content)
    name = f"{uuid.uuid4().hex}{ext}"
    folder = Path(settings.upload_dir)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / name).write_bytes(content)
    url = f"/uploads/{name}"
    image = ProductImage(product_id=product.id, url=url, alt=product.name, sort_order=len(product.images))
    db.add(image)
    await db.commit()
    return {"url": url, "id": str(image.id)}


@router.post("/prices/preview", response_model=BulkPreviewOut)
async def price_preview(
    payload: BulkPriceIn,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> BulkPreviewOut:
    return await prices.preview(db, payload)


@router.post("/prices/apply", response_model=BulkApplyOut)
async def price_apply(
    payload: BulkPriceIn,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> BulkApplyOut:
    batch = await prices.apply_bulk(db, payload, user.id)
    await db.commit()
    return BulkApplyOut(batch_id=batch.id, updated=batch.product_count)


@router.get("/prices/last", response_model=LastBatchOut)
async def price_last(
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
    product_ids: Annotated[list[UUID] | None, Query()] = None,
) -> LastBatchOut:
    return await prices.last_undoable(db, product_ids or None)


@router.post("/prices/undo")
async def price_undo(
    payload: UndoIn,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    count = await prices.undo_last(db, user.id, payload.product_ids or None)
    await db.commit()
    return {"restored": count}


@router.get("/push/vapid")
async def push_vapid(
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    keys = await push.load_vapid(db)
    await db.commit()
    return {"public_key": keys["public"]}


@router.post("/push/subscribe")
async def push_subscribe(
    payload: PushSubscribeIn,
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    await push.subscribe(db, user.id, payload, request.headers.get("user-agent"))
    await db.commit()
    return {"ok": True}


@router.post("/push/unsubscribe")
async def push_unsubscribe(
    payload: PushUnsubscribeIn,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    await push.unsubscribe(db, user.id, payload.endpoint)
    await db.commit()
    return {"ok": True}


@router.post("/push/test")
async def push_test(
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    sent = await push.send_test(db, user.id)
    await db.commit()
    return {"sent": sent}


@router.get("/orders", response_model=list[OrderOut])
async def list_orders(
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[OrderOut]:
    rows = (
        await db.scalars(select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc()).limit(200))
    ).all()
    return [OrderOut.model_validate(row) for row in rows]


@router.get("/orders/stats")
async def order_stats(
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    new_count = await db.scalar(select(func.count()).select_from(Order).where(Order.status == OrderStatus.new))
    return {"new_count": int(new_count or 0)}


@router.get("/orders/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> OrderOut:
    order = await db.scalar(select(Order).options(selectinload(Order.items)).where(Order.id == order_id))
    if not order:
        raise HTTPException(status_code=404, detail="Не найдено")
    return OrderOut.model_validate(order)


@router.patch("/orders/{order_id}", response_model=OrderOut)
async def patch_order(
    order_id: UUID,
    payload: OrderStatusIn,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> OrderOut:
    order = await db.scalar(select(Order).options(selectinload(Order.items)).where(Order.id == order_id))
    if not order:
        raise HTTPException(status_code=404, detail="Не найдено")
    order.status = payload.status
    await db.commit()
    await db.refresh(order)
    return OrderOut.model_validate(order)


@router.delete("/orders/{order_id}")
async def delete_order(
    order_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    order = await db.scalar(select(Order).where(Order.id == order_id))
    if not order:
        raise HTTPException(status_code=404, detail="Не найдено")
    if order.status != OrderStatus.closed:
        raise HTTPException(status_code=400, detail="Удалить можно только закрытую заявку")
    await db.delete(order)
    await db.commit()
    return {"deleted": True}
