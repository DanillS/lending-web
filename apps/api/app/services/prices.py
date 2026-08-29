from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import case, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PriceBatch, PriceHistory, Product
from app.schemas import BulkPreviewOut, BulkPreviewRow, BulkPriceIn, LastBatchOut, LastBatchRow
from app.utils import apply_percent


def _filters(payload: BulkPriceIn):
    clauses = [Product.deleted_at.is_(None)]
    if payload.select_all:
        if payload.product_type:
            clauses.append(Product.type == payload.product_type)
    else:
        if not payload.product_ids:
            raise HTTPException(status_code=400, detail="Выберите товары")
        clauses.append(Product.id.in_(payload.product_ids))
    return clauses


async def preview(db: AsyncSession, payload: BulkPriceIn) -> BulkPreviewOut:
    if payload.percent == 0:
        raise HTTPException(status_code=400, detail="Процент не должен быть 0")
    products = list((await db.scalars(select(Product).where(*_filters(payload)).order_by(Product.name))).all())
    rows = [
        BulkPreviewRow(
            id=product.id,
            name=product.name,
            type=product.type,
            base_price=product.base_price,
            current_price=product.current_price,
            new_price=apply_percent(product.base_price, payload.percent),
        )
        for product in products[:10]
    ]
    return BulkPreviewOut(count=len(products), rows=rows)


async def apply_bulk(db: AsyncSession, payload: BulkPriceIn, user_id: UUID | None) -> PriceBatch:
    if payload.percent == 0:
        raise HTTPException(status_code=400, detail="Процент не должен быть 0")

    products = list((await db.scalars(select(Product).where(*_filters(payload)).with_for_update())).all())
    if not products:
        raise HTTPException(status_code=400, detail="Нет товаров для пересчёта")

    new_prices = {p.id: apply_percent(p.base_price, payload.percent) for p in products}
    if not payload.allow_zero and any(price <= 0 for price in new_prices.values()):
        raise HTTPException(status_code=400, detail="Пересчёт даёт нулевую цену. Включите разрешение нуля.")

    batch = PriceBatch(id=uuid4(), percent=payload.percent, product_count=len(products), created_by=user_id)
    db.add(batch)
    await db.flush()
    db.add_all(
        [
            PriceHistory(
                product_id=p.id,
                batch_id=batch.id,
                base_price=p.base_price,
                old_current=p.current_price,
                new_current=new_prices[p.id],
                percent=payload.percent,
                user_id=user_id,
            )
            for p in products
        ]
    )

    ids = [p.id for p in products]
    factor = 1 + payload.percent / 100.0
    new_expr = func.round(Product.base_price * factor)
    await db.execute(
        update(Product)
        .where(Product.id.in_(ids), Product.deleted_at.is_(None))
        .values(
            current_price=new_expr,
            old_price=case((new_expr < Product.base_price, Product.base_price), else_=None),
            updated_at=func.now(),
        )
    )
    await db.flush()
    return batch


async def _latest_batch(db: AsyncSession) -> PriceBatch | None:
    return await db.scalar(
        select(PriceBatch).where(PriceBatch.undone_at.is_(None)).order_by(PriceBatch.created_at.desc()).limit(1)
    )


def _pending_history(batch_id: UUID, product_ids: list[UUID] | None):
    clauses = [PriceHistory.batch_id == batch_id, PriceHistory.undone_at.is_(None)]
    if product_ids:
        clauses.append(PriceHistory.product_id.in_(product_ids))
    return clauses


async def last_undoable(db: AsyncSession, product_ids: list[UUID] | None = None) -> LastBatchOut:
    batch = await _latest_batch(db)
    if not batch:
        raise HTTPException(status_code=404, detail="Нет пересчёта для отмены")
    pending = list(
        (
            await db.execute(
                select(PriceHistory, Product)
                .join(Product, Product.id == PriceHistory.product_id)
                .where(*_pending_history(batch.id, None))
                .order_by(Product.name)
            )
        ).all()
    )
    if not pending:
        raise HTTPException(status_code=404, detail="Нет пересчёта для отмены")
    chosen = pending
    filtered = bool(product_ids)
    if filtered:
        wanted = set(product_ids)
        chosen = [(history, product) for history, product in pending if history.product_id in wanted]
        if not chosen:
            raise HTTPException(status_code=400, detail="Выбранные товары не входили в последний пересчёт")
    return LastBatchOut(
        percent=batch.percent,
        count=len(chosen),
        batch_count=len(pending),
        filtered=filtered,
        rows=[
            LastBatchRow(
                id=history.product_id,
                name=product.name,
                current_price=product.current_price,
                restore_price=history.old_current,
            )
            for history, product in chosen
        ],
    )


async def undo_last(db: AsyncSession, user_id: UUID | None, product_ids: list[UUID] | None = None) -> int:
    batch = await _latest_batch(db)
    if not batch:
        raise HTTPException(status_code=400, detail="Нет пересчёта для отмены")

    rows = list((await db.scalars(select(PriceHistory).where(*_pending_history(batch.id, product_ids)))).all())
    if product_ids and not rows:
        raise HTTPException(status_code=400, detail="Выбранные товары не входили в последний пересчёт")
    if not rows:
        raise HTTPException(status_code=400, detail="Нет пересчёта для отмены")

    by_product = {row.product_id: row.old_current for row in rows}
    products = list((await db.scalars(select(Product).where(Product.id.in_(list(by_product))))).all())
    now = datetime.now(timezone.utc)
    for product in products:
        restored = by_product[product.id]
        product.current_price = restored
        product.old_price = product.base_price if restored < product.base_price else None
    for row in rows:
        row.undone_at = now
    await db.flush()
    leftover = await db.scalar(
        select(func.count()).select_from(PriceHistory).where(*_pending_history(batch.id, None))
    )
    if not leftover:
        batch.undone_at = now
        await db.flush()
    return len(products)
