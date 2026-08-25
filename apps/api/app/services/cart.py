from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Cart, CartItem
from app.schemas import CartItemIn, KitType, QuoteRequest
from app.services import quote as quote_service


async def get_or_create_cart(db: AsyncSession, cart_id: UUID | None) -> Cart:
    if cart_id:
        cart = await db.scalar(select(Cart).options(selectinload(Cart.items)).where(Cart.id == cart_id))
        if cart:
            return cart
    cart = Cart()
    db.add(cart)
    await db.flush()
    return cart


async def load_cart(db: AsyncSession, cart_id: UUID) -> Cart | None:
    return await db.scalar(select(Cart).options(selectinload(Cart.items)).where(Cart.id == cart_id))


async def add_item(db: AsyncSession, cart: Cart, payload: CartItemIn) -> CartItem:
    if payload.config:
        quoted = await quote_service.quote(db, payload.config)
        label = next((line.title for line in quoted.lines), "Комплект")
        total = quoted.total
        config = quoted.config
    else:
        quoted = await quote_service.quote(
            db,
            QuoteRequest(product_id=payload.product_id, kit=KitType.leaf_only, quantity=payload.quantity),
        )
        label = quoted.lines[0].title if quoted.lines else "Товар"
        total = quoted.total
        config = quoted.config

    item = CartItem(
        cart_id=cart.id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        config_json=config,
        quoted_total=total,
        label=label,
    )
    db.add(item)
    await db.flush()
    return item


async def remove_item(db: AsyncSession, cart: Cart, item_id: UUID) -> None:
    item = next((row for row in cart.items if row.id == item_id), None)
    if item:
        await db.delete(item)


def cart_total(cart: Cart) -> int:
    return sum(item.quoted_total for item in cart.items)
