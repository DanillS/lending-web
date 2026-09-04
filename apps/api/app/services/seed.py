from __future__ import annotations

import json
import logging
from pathlib import Path

from datetime import datetime, timezone

from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified

from app.config import get_settings
from app.models import Product, ProductImage, ProductType, SiteSetting, User
from app.security import hash_password
from app.utils import slugify

logger = logging.getLogger(__name__)
settings = get_settings()

PUBLIC_PHONE = "+79046726360"
PUBLIC_EMAIL = "dinamo7933@gmail.com"
PUBLIC_WHATSAPP = "https://wa.me/79046726360"

GLASS_NAME = {
    "С матовым стеклом": "матовое стекло",
    "С белым стеклом": "белое стекло",
    "С черным стеклом": "чёрное стекло",
    "Стекло Витраж": "витраж",
    "Молдинг черный": "чёрный молдинг",
    "зеркало": "зеркало",
    "Без стекла": "без стекла",
}

ACCESSORY_IMAGES = {
    "HANDLE-STD": "/images/accessories/handle.svg",
    "HINGE-STD": "/images/accessories/hinge.svg",
    "HINGE-HIDDEN": "/images/accessories/hinge.svg",
    "LOCK-STD": "/images/accessories/lock.svg",
    "FRAME-STD": "/images/accessories/frame.svg",
    "CASING-STD": "/images/accessories/casing.svg",
    "EXT-STD": "/images/accessories/frame.svg",
    "SVC-INSTALL": "/images/accessories/service.svg",
    "SVC-DELIVERY": "/images/accessories/service.svg",
    "SVC-CUTTING": "/images/accessories/service.svg",
}

ACCESSORIES = [
    (ProductType.frame, "FRAME-STD", "Коробка стандарт", 720, "Погонаж"),
    (ProductType.casing, "CASING-STD", "Наличник стандарт", 460, "Погонаж"),
    (ProductType.extender, "EXT-STD", "Добор стандарт", 650, "Погонаж"),
    (ProductType.handle, "HANDLE-STD", "Ручка стандарт", 1200, "Фурнитура"),
    (ProductType.hinge, "HINGE-STD", "Петля универсальная", 350, "Фурнитура"),
    (ProductType.hinge, "HINGE-HIDDEN", "Петля скрытая", 900, "Фурнитура"),
    (ProductType.lock, "LOCK-STD", "Защёлка / замок", 800, "Фурнитура"),
    (ProductType.service, "SVC-INSTALL", "Установка под ключ", 2500, "Услуги"),
    (ProductType.service, "SVC-DELIVERY", "Доставка по Казани", 1500, "Услуги"),
    (ProductType.service, "SVC-CUTTING", "Врезка фурнитуры", 800, "Услуги"),
]


def _unique_name(raw_name: str, specs: dict, used: set[str]) -> str:
    name = raw_name
    glass = specs.get("Вид стекла")
    suffix = GLASS_NAME.get(glass)
    if name in used and suffix and suffix not in name.lower():
        name = f"{raw_name}, {suffix}"
    n = 2
    base = name
    while name in used:
        name = f"{base} ({n})"
        n += 1
    used.add(name)
    return name


def _fix_old_price(price: int, old_price: int | None) -> int | None:
    if not old_price:
        return None
    if old_price > price * 5:
        # id 11 typo 822211 -> 8222
        candidate = int(str(old_price)[:4]) if old_price > 100000 else round(old_price / 100)
        return candidate if candidate > price else None
    return old_price


def _fix_description(text: str) -> str:
    return (
        text.replace("полоно", "полотно")
        .replace("входные двери", "межкомнатные двери")
        .replace("входных дверей", "межкомнатных дверей")
    )


async def seed(db: AsyncSession) -> None:
    await db.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
    await db.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent"))

    admin = await db.scalar(select(User).where(User.email == settings.admin_email))
    if not admin:
        db.add(
            User(
                email=settings.admin_email,
                password_hash=hash_password(settings.admin_password),
            )
        )

    existing = await db.scalar(select(func.count(Product.id)))
    if not existing:
        await _seed_catalog(db)
        await _seed_accessories(db)
        await _refresh_search(db)
    await _repair_catalog(db)
    await _sync_public_contacts(db)
    await db.commit()


async def _sync_public_contacts(db: AsyncSession) -> None:
    contacts = {
        "phone": PUBLIC_PHONE,
        "whatsapp": PUBLIC_WHATSAPP,
        "email": PUBLIC_EMAIL,
    }
    row = await db.scalar(select(SiteSetting).where(SiteSetting.key == "public"))
    if not row:
        db.add(
            SiteSetting(
                key="public",
                value={
                    "name": "Качественные двери",
                    "telegram": "https://t.me/pr0gger/",
                    "city": "Казань",
                    "reviews": [
                        {"text": "Быстрая установка, отличное качество! Вернусь снова.", "author": "Алексей Иванов"},
                        {"text": "Двери шикарные, менеджеры помогли с выбором.", "author": "Мария Петрова"},
                        {"text": "Лучшее соотношение цены и качества в Казани.", "author": "Дмитрий Соколов"},
                        {"text": "Всё понравилось, двери качественные, установка тоже.", "author": "Данил Степанов"},
                    ],
                    "faq": [
                        {
                            "q": "Есть ли гарантия?",
                            "a": "Да, на все двери гарантия до 5 лет, на монтаж — 1 год.",
                        },
                        {
                            "q": "Как сделать заказ?",
                            "a": "Соберите комплект в корзине или напишите в WhatsApp — перезвоним в течение 15 минут.",
                        },
                    ],
                    **contacts,
                },
            )
        )
        return
    value = dict(row.value)
    if all(value.get(key) == contacts[key] for key in contacts):
        return
    value.update(contacts)
    row.value = value
    flag_modified(row, "value")


async def _seed_catalog(db: AsyncSession) -> None:
    path = Path("/app/data/products.json")
    if not path.exists():
        path = Path(__file__).resolve().parents[4] / "data" / "products.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    used_names: set[str] = set()
    used_slugs: set[str] = set()
    for item in data["products"]:
        specs = item.get("specs") or {}
        name = _unique_name(item["name"], specs, used_names)
        slug = slugify(name)
        base_slug = slug
        i = 2
        while slug in used_slugs:
            slug = f"{base_slug}-{i}"
            i += 1
        used_slugs.add(slug)
        price = int(item["price"])
        old = _fix_old_price(price, item.get("oldPrice"))
        product = Product(
            sku=f"DOOR-{item['id']}",
            slug=slug,
            type=ProductType.door_leaf,
            name=name,
            series=name.split("(")[0].strip(),
            description=_fix_description(item.get("description") or ""),
            brand=specs.get("Производитель"),
            manufacturer=specs.get("Производитель"),
            category=item.get("category"),
            covering=specs.get("Покрытие"),
            glass_type=specs.get("Вид стекла"),
            style=specs.get("Стиль оформления"),
            opening_system=specs.get("Система открывания"),
            specs=specs,
            base_price=price,
            current_price=price,
            old_price=old,
            popular=bool(item.get("popular")),
            seo_title=f"{name} — купить в Казани",
            seo_description=(item.get("description") or "")[:300],
        )
        db.add(product)
        await db.flush()
        image = item.get("image") or "/images/placeholder.svg"
        db.add(ProductImage(product_id=product.id, url=image, alt=name, sort_order=0))


async def _seed_accessories(db: AsyncSession) -> None:
    for ptype, sku, name, price, brand in ACCESSORIES:
        exists = await db.scalar(select(Product).where(Product.sku == sku))
        if exists:
            continue
        product = Product(
            sku=sku,
            slug=slugify(sku + "-" + name),
            type=ptype,
            name=name,
            description=f"{name} для комплекта межкомнатной двери",
            brand=brand,
            base_price=price,
            current_price=price,
            is_active=True,
        )
        db.add(product)
        await db.flush()
        image_url = ACCESSORY_IMAGES.get(sku)
        if image_url:
            db.add(ProductImage(product_id=product.id, url=image_url, alt=name, sort_order=0))


async def _repair_catalog(db: AsyncSession) -> None:
    junk = (
        await db.scalars(
            select(Product).where(
                or_(Product.sku == "SKU-E042F708", Product.slug == "vjkxcjvlkj", Product.name == "vjkxcjvlkj")
            )
        )
    ).all()
    now = datetime.now(timezone.utc)
    for product in junk:
        product.is_active = False
        product.deleted_at = now

    drifted = (
        await db.scalars(
            select(Product).where(
                Product.type == ProductType.door_leaf,
                Product.deleted_at.is_(None),
                Product.current_price != Product.base_price,
            )
        )
    ).all()
    for product in drifted:
        product.current_price = product.base_price

    accessories = (
        await db.scalars(
            select(Product)
            .options(selectinload(Product.images))
            .where(Product.sku.in_(list(ACCESSORY_IMAGES)), Product.deleted_at.is_(None))
        )
    ).all()
    for product in accessories:
        if product.images:
            continue
        db.add(
            ProductImage(
                product_id=product.id,
                url=ACCESSORY_IMAGES[product.sku],
                alt=product.name,
                sort_order=0,
            )
        )


async def _refresh_search(db: AsyncSession) -> None:
    await db.execute(
        text(
            """
            UPDATE products
            SET search_vector =
                setweight(to_tsvector('russian', coalesce(name, '')), 'A') ||
                setweight(to_tsvector('russian', coalesce(description, '')), 'B') ||
                setweight(to_tsvector('russian', coalesce(manufacturer, '')), 'C')
            """
        )
    )
