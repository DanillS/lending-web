from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, File, HTTPException, Query, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.db import get_db
from app.models import Order, Product, ProductImage, ProductType, User
from app.schemas import (
    BulkApplyOut,
    BulkPreviewOut,
    BulkPriceIn,
    LoginIn,
    OrderOut,
    OrderStatusIn,
    ProductCardOut,
    ProductListOut,
    ProductWrite,
)
from app.security import (
    REFRESH_COOKIE,
    clear_auth_cookies,
    decode_token,
    get_current_user,
    set_auth_cookies,
    verify_password,
)
from app.services import catalog, prices
from app.utils import slugify

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])
settings = get_settings()
ALLOWED_MIME = {"image/webp", "image/jpeg", "image/png"}


@router.post("/login")
async def login(payload: LoginIn, response: Response, db: AsyncSession = Depends(get_db)) -> dict:
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
    product = Product(
        sku=sku,
        slug=slug,
        type=payload.type,
        name=payload.name,
        series=payload.series,
        description=payload.description,
        brand=payload.brand,
        manufacturer=payload.manufacturer,
        category=payload.category,
        covering=payload.covering,
        glass_type=payload.glass_type,
        style=payload.style,
        opening_system=payload.opening_system,
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
    await db.commit()
    await db.refresh(product)
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
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Только webp, jpeg, png")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл больше 5 МБ")
    ext = {"image/webp": ".webp", "image/jpeg": ".jpg", "image/png": ".png"}[file.content_type]
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


@router.post("/prices/undo")
async def price_undo(
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    count = await prices.undo_last(db, user.id)
    await db.commit()
    return {"restored": count}


@router.get("/orders", response_model=list[OrderOut])
async def list_orders(
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[OrderOut]:
    rows = (
        await db.scalars(select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc()).limit(200))
    ).all()
    return [OrderOut.model_validate(row) for row in rows]


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
