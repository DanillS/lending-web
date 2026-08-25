from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Product, ProductType

logger = logging.getLogger(__name__)


def apply_search(stmt: Select[Any], q: str | None) -> Select[Any]:
    if not q or not q.strip():
        return stmt
    query = q.strip()
    like = f"%{query}%"
    return stmt.where(
        or_(
            Product.name.ilike(like),
            Product.series.ilike(like),
            Product.brand.ilike(like),
            Product.manufacturer.ilike(like),
            Product.description.ilike(like),
            Product.search_vector.op("@@")(func.plainto_tsquery("russian", query)),
        )
    )


async def list_products(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 24,
    q: str | None = None,
    product_type: ProductType | None = None,
    category: str | None = None,
    covering: str | None = None,
    brand: str | None = None,
    popular: bool | None = None,
    price_min: int | None = None,
    price_max: int | None = None,
    sort: str = "name",
    active_only: bool = True,
    include_deleted: bool = False,
) -> tuple[list[Product], int]:
    stmt = select(Product).options(selectinload(Product.images))
    count_stmt = select(func.count(Product.id))
    filters = []
    if active_only:
        filters.append(Product.is_active.is_(True))
    if not include_deleted:
        filters.append(Product.deleted_at.is_(None))
    if product_type:
        filters.append(Product.type == product_type)
    if category and category != "all":
        filters.append(Product.category == category)
    if covering:
        filters.append(Product.covering == covering)
    if brand:
        filters.append(Product.brand == brand)
    if popular is True:
        filters.append(Product.popular.is_(True))
    if price_min is not None:
        filters.append(Product.current_price >= price_min)
    if price_max is not None:
        filters.append(Product.current_price <= price_max)
    if filters:
        stmt = stmt.where(*filters)
        count_stmt = count_stmt.where(*filters)
    stmt = apply_search(stmt, q)
    count_stmt = apply_search(count_stmt, q)

    if sort == "price_asc":
        stmt = stmt.order_by(Product.current_price.asc(), Product.name.asc())
    elif sort == "price_desc":
        stmt = stmt.order_by(Product.current_price.desc(), Product.name.asc())
    elif sort == "new":
        stmt = stmt.order_by(Product.created_at.desc())
    else:
        stmt = stmt.order_by(Product.name.asc())

    total = int(await db.scalar(count_stmt) or 0)
    offset = max(page - 1, 0) * page_size
    rows = (await db.scalars(stmt.offset(offset).limit(page_size))).unique().all()
    return list(rows), total


async def get_by_slug(db: AsyncSession, slug: str) -> Product | None:
    return await db.scalar(
        select(Product)
        .options(selectinload(Product.images))
        .where(Product.slug == slug, Product.deleted_at.is_(None), Product.is_active.is_(True))
    )


async def get_by_id(db: AsyncSession, product_id: UUID, *, with_deleted: bool = False) -> Product | None:
    stmt = select(Product).options(selectinload(Product.images)).where(Product.id == product_id)
    if not with_deleted:
        stmt = stmt.where(Product.deleted_at.is_(None))
    return await db.scalar(stmt)


async def get_by_sku(db: AsyncSession, sku: str) -> Product | None:
    return await db.scalar(
        select(Product).where(Product.sku == sku, Product.deleted_at.is_(None), Product.is_active.is_(True))
    )
