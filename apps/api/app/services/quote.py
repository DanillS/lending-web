from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Product, ProductType
from app.schemas import HardwarePreset, KitType, QuoteLine, QuoteRequest, QuoteResponse
from app.services import catalog as catalog_service

SKU_FRAME = "FRAME-STD"
SKU_CASING = "CASING-STD"
SKU_EXTENDER = "EXT-STD"
SKU_HANDLE = "HANDLE-STD"
SKU_HINGE = "HINGE-STD"
SKU_HINGE_HIDDEN = "HINGE-HIDDEN"
SKU_LOCK = "LOCK-STD"
SKU_INSTALL = "SVC-INSTALL"
SKU_DELIVERY = "SVC-DELIVERY"
SKU_CUTTING = "SVC-CUTTING"

SERVICE_SKU = {
    "install": SKU_INSTALL,
    "delivery": SKU_DELIVERY,
    "cutting": SKU_CUTTING,
}


def leaf_size_surcharge(base_price: int, size: str) -> int:
    if size == "900x2000":
        return max(500, int(round(base_price * 0.12)))
    return 0


@dataclass
class _Line:
    sku: str
    title: str
    quantity: float
    unit_price: int
    product_id: UUID | None

    @property
    def line_total(self) -> int:
        return int(round(self.unit_price * self.quantity))


async def _sku(db: AsyncSession, sku: str) -> Product:
    product = await catalog_service.get_by_sku(db, sku)
    if not product:
        raise ValueError(f"Не найден комплектующий SKU {sku}. Запустите seed.")
    return product


def _add(lines: list[_Line], product: Product, qty: float, title: str | None = None, unit_price: int | None = None) -> None:
    lines.append(
        _Line(
            sku=product.sku,
            title=title or product.name,
            quantity=qty,
            unit_price=product.current_price if unit_price is None else unit_price,
            product_id=product.id,
        )
    )


async def quote(db: AsyncSession, payload: QuoteRequest) -> QuoteResponse:
    product = await catalog_service.get_by_id(db, payload.product_id)
    if not product:
        raise ValueError("Товар не найден")

    lines: list[_Line] = []
    is_door = product.type == ProductType.door_leaf
    kit = payload.kit if is_door else KitType.leaf_only
    hardware = payload.hardware if is_door else HardwarePreset.none
    services = payload.services if is_door else []

    _add(lines, product, 1, product.name)

    if is_door:
        extra = leaf_size_surcharge(product.current_price, payload.size)
        if extra:
            lines.append(
                _Line(
                    sku="SIZE-900",
                    title=f"Наценка за размер {payload.size}",
                    quantity=1,
                    unit_price=extra,
                    product_id=None,
                )
            )

        if kit in (KitType.standard_block, KitType.block_plus_extenders):
            _add(lines, await _sku(db, SKU_FRAME), 2.5)
            _add(lines, await _sku(db, SKU_CASING), 5.0)

        if kit == KitType.block_plus_extenders:
            extra_wall = max(0, payload.wall_thickness_mm - 80)
            qty = 2.5 if extra_wall <= 100 else 5.0
            _add(lines, await _sku(db, SKU_EXTENDER), qty)

        if hardware in (HardwarePreset.minimal, HardwarePreset.hidden_hinges):
            hinge_sku = SKU_HINGE_HIDDEN if hardware == HardwarePreset.hidden_hinges else SKU_HINGE
            _add(lines, await _sku(db, hinge_sku), 2)
            handle = None
            if payload.handle_id:
                handle = await catalog_service.get_by_id(db, payload.handle_id)
            _add(lines, handle or await _sku(db, SKU_HANDLE), 1)
            _add(lines, await _sku(db, SKU_LOCK), 1)

        for key in services:
            sku = SERVICE_SKU.get(key)
            if sku:
                _add(lines, await _sku(db, sku), 1)

    qty = payload.quantity
    out_lines = [
        QuoteLine(
            sku=ln.sku,
            title=ln.title,
            quantity=ln.quantity * qty,
            unit_price=ln.unit_price,
            line_total=ln.line_total * qty,
            product_id=ln.product_id,
        )
        for ln in lines
    ]
    total = sum(item.line_total for item in out_lines)
    config: dict[str, Any] = payload.model_dump(mode="json")
    if not is_door:
        config["kit"] = KitType.leaf_only.value
        config["hardware"] = HardwarePreset.none.value
    return QuoteResponse(lines=out_lines, total=total, config=config)
