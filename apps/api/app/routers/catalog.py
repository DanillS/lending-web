from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import ProductType
from app.schemas import ProductCardOut, ProductListOut, QuoteRequest, QuoteResponse
from app.services import catalog, quote

router = APIRouter(prefix="/api/v1", tags=["catalog"])


@router.get("/products", response_model=ProductListOut)
async def list_products(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    q: str | None = None,
    type: ProductType | None = None,
    category: str | None = None,
    covering: str | None = None,
    brand: str | None = None,
    popular: bool | None = None,
    price_min: int | None = None,
    price_max: int | None = None,
    sort: str = "name",
) -> ProductListOut:
    items, total = await catalog.list_products(
        db,
        page=page,
        page_size=page_size,
        q=q,
        product_type=type,
        category=category,
        covering=covering,
        brand=brand,
        popular=popular,
        price_min=price_min,
        price_max=price_max,
        sort=sort,
    )
    return ProductListOut(
        items=[ProductCardOut.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/products/{slug}", response_model=ProductCardOut)
async def product_detail(slug: str, db: AsyncSession = Depends(get_db)) -> ProductCardOut:
    product = await catalog.get_by_slug(db, slug)
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return ProductCardOut.model_validate(product)


@router.post("/quote", response_model=QuoteResponse)
async def make_quote(payload: QuoteRequest, db: AsyncSession = Depends(get_db)) -> QuoteResponse:
    try:
        return await quote.quote(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/handles", response_model=ProductListOut)
async def handles(db: AsyncSession = Depends(get_db)) -> ProductListOut:
    items, total = await catalog.list_products(db, product_type=ProductType.handle, page_size=50)
    return ProductListOut(items=[ProductCardOut.model_validate(i) for i in items], total=total, page=1, page_size=50)
