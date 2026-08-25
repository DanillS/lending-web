from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import OrderStatus, ProductType
from app.utils import is_valid_ru_phone


class OrmModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class KitType(str, Enum):
    leaf_only = "leaf_only"
    standard_block = "standard_block"
    block_plus_extenders = "block_plus_extenders"


class HardwarePreset(str, Enum):
    none = "none"
    minimal = "minimal"
    hidden_hinges = "hidden_hinges"


class Opening(str, Enum):
    left = "left"
    right = "right"


class ImageOut(OrmModel):
    id: uuid.UUID
    url: str
    alt: str
    sort_order: int


class ProductCardOut(OrmModel):
    id: uuid.UUID
    sku: str
    slug: str
    type: ProductType
    name: str
    series: str | None
    description: str
    brand: str | None
    manufacturer: str | None
    category: str | None
    covering: str | None
    glass_type: str | None
    style: str | None
    opening_system: str | None
    specs: dict[str, Any]
    base_price: int
    current_price: int
    old_price: int | None
    popular: bool
    seo_title: str | None
    seo_description: str | None
    images: list[ImageOut] = []


class ProductListOut(BaseModel):
    items: list[ProductCardOut]
    total: int
    page: int
    page_size: int


class QuoteLine(BaseModel):
    sku: str
    title: str
    quantity: float
    unit_price: int
    line_total: int
    product_id: uuid.UUID | None = None


class QuoteRequest(BaseModel):
    product_id: uuid.UUID
    size: str = "800x2000"
    opening: Opening = Opening.left
    kit: KitType = KitType.standard_block
    wall_thickness_mm: int = Field(default=100, ge=50, le=400)
    hardware: HardwarePreset = HardwarePreset.none
    handle_id: uuid.UUID | None = None
    services: list[str] = []
    quantity: int = Field(default=1, ge=1, le=50)

    @field_validator("size")
    @classmethod
    def size_ok(cls, value: str) -> str:
        allowed = {"600x2000", "700x2000", "800x2000", "900x2000"}
        if value not in allowed:
            raise ValueError("Размер полотна: 600/700/800/900 x 2000")
        return value


class QuoteResponse(BaseModel):
    lines: list[QuoteLine]
    total: int
    config: dict[str, Any]


class CartItemIn(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(default=1, ge=1, le=50)
    config: QuoteRequest | None = None


class CartItemOut(OrmModel):
    id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    config_json: dict[str, Any]
    quoted_total: int
    label: str


class CartOut(BaseModel):
    id: uuid.UUID
    items: list[CartItemOut]
    total: int


class CheckoutIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=10, max_length=32)
    comment: str = Field(default="", max_length=2000)
    consent: bool
    honeypot: str = ""
    idempotency_key: str = Field(min_length=8, max_length=80)

    @field_validator("phone")
    @classmethod
    def phone_ok(cls, value: str) -> str:
        if not is_valid_ru_phone(value):
            raise ValueError("Укажите телефон в формате +7 900 000-00-00")
        return value

    @field_validator("consent")
    @classmethod
    def consent_ok(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Нужно согласие на обработку персональных данных")
        return value


class OrderOut(OrmModel):
    id: uuid.UUID
    public_number: str
    status: OrderStatus
    customer_name: str
    phone: str
    comment: str
    total_snapshot: int
    created_at: datetime
    items: list["OrderItemOut"] = []


class OrderItemOut(OrmModel):
    id: uuid.UUID
    title: str
    quantity: int
    unit_price: int
    line_total: int
    config_json: dict[str, Any]


class LoginIn(BaseModel):
    email: str
    password: str


class ProductWrite(BaseModel):
    sku: str | None = None
    slug: str | None = None
    type: ProductType = ProductType.door_leaf
    name: str = Field(min_length=2, max_length=255)
    series: str | None = None
    description: str = ""
    brand: str | None = None
    manufacturer: str | None = None
    category: str | None = None
    covering: str | None = None
    glass_type: str | None = None
    style: str | None = None
    opening_system: str | None = None
    specs: dict[str, Any] = {}
    base_price: int = Field(ge=0)
    current_price: int | None = Field(default=None, ge=0)
    old_price: int | None = Field(default=None, ge=0)
    popular: bool = False
    is_active: bool = True
    seo_title: str | None = None
    seo_description: str | None = None


class BulkPriceIn(BaseModel):
    product_ids: list[uuid.UUID] = []
    select_all: bool = False
    product_type: ProductType | None = None
    percent: int = Field(ge=-90, le=200)
    allow_zero: bool = False


class BulkPreviewRow(BaseModel):
    id: uuid.UUID
    name: str
    type: ProductType
    base_price: int
    current_price: int
    new_price: int


class BulkPreviewOut(BaseModel):
    count: int
    rows: list[BulkPreviewRow]


class BulkApplyOut(BaseModel):
    batch_id: uuid.UUID
    updated: int


class OrderStatusIn(BaseModel):
    status: OrderStatus


class SitePublicOut(BaseModel):
    name: str
    phone: str
    whatsapp: str
    telegram: str
    email: str
    city: str
    reviews: list[dict[str, str]]
    faq: list[dict[str, str]]
