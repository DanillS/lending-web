from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models import Cart, Order
from app.schemas import CartItemIn, CartItemOut, CartOut, CheckoutIn, OrderOut
from app.services import cache, cart as cart_svc, notify, orders
from app.services.orders import QuoteChanged

router = APIRouter(prefix="/api/v1", tags=["cart"])
CART_COOKIE = "cart_id"


def _cookie_id(request: Request) -> UUID | None:
    raw = request.cookies.get(CART_COOKIE)
    if not raw:
        return None
    try:
        return UUID(raw)
    except ValueError:
        return None


def _set_cart_cookie(response: Response, cart_id: UUID) -> None:
    response.set_cookie(
        CART_COOKIE,
        str(cart_id),
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 30,
        path="/",
    )


async def _cart(request: Request, db: AsyncSession, create: bool = False) -> Cart:
    cart_id = _cookie_id(request)
    if create:
        return await cart_svc.get_or_create_cart(db, cart_id)
    if not cart_id:
        raise HTTPException(status_code=404, detail="Корзина не найдена")
    found = await cart_svc.load_cart(db, cart_id)
    if not found:
        raise HTTPException(status_code=404, detail="Корзина не найдена")
    return found


def _out(cart: Cart) -> CartOut:
    return CartOut(
        id=cart.id,
        items=[CartItemOut.model_validate(item) for item in cart.items],
        total=cart_svc.cart_total(cart),
    )


@router.get("/cart", response_model=CartOut)
async def get_cart(request: Request, response: Response, db: AsyncSession = Depends(get_db)) -> CartOut:
    cart = await cart_svc.get_or_create_cart(db, _cookie_id(request))
    await db.commit()
    _set_cart_cookie(response, cart.id)
    loaded = await cart_svc.load_cart(db, cart.id)
    return _out(loaded or cart)


@router.post("/cart/items", response_model=CartOut)
async def add_item(
    payload: CartItemIn, request: Request, response: Response, db: AsyncSession = Depends(get_db)
) -> CartOut:
    cart = await _cart(request, db, create=True)
    try:
        await cart_svc.add_item(db, cart, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await db.commit()
    loaded = await cart_svc.load_cart(db, cart.id)
    _set_cart_cookie(response, cart.id)
    return _out(loaded or cart)


@router.delete("/cart/items/{item_id}", response_model=CartOut)
async def delete_item(
    item_id: UUID, request: Request, response: Response, db: AsyncSession = Depends(get_db)
) -> CartOut:
    cart = await _cart(request, db)
    await cart_svc.remove_item(db, cart, item_id)
    await db.commit()
    loaded = await cart_svc.load_cart(db, cart.id)
    _set_cart_cookie(response, cart.id)
    return _out(loaded or cart)


@router.post("/orders", response_model=OrderOut)
async def checkout(
    payload: CheckoutIn, request: Request, response: Response, db: AsyncSession = Depends(get_db)
) -> OrderOut:
    if payload.honeypot:
        raise HTTPException(status_code=400, detail="Отклонено")
    ip = request.client.host if request.client else "unknown"
    if await cache.rate_limited(f"order:{ip}", limit=5, window_sec=600):
        raise HTTPException(status_code=429, detail="Слишком много заявок, подождите")
    cart = await _cart(request, db, create=True)
    _set_cart_cookie(response, cart.id)
    try:
        order = await orders.create_order(db, cart, payload)
        await db.commit()
    except QuoteChanged as exc:
        await db.commit()
        raise HTTPException(status_code=409, detail={"message": str(exc), "new_total": exc.new_total}) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    full = await db.scalar(select(Order).options(selectinload(Order.items)).where(Order.id == order.id))
    try:
        await notify.notify_order(full or order, db)
    except Exception:
        pass
    return OrderOut.model_validate(full or order)
