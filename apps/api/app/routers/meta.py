from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_db
from app.models import Product, ProductType, SiteSetting
from app.schemas import SitePublicOut

router = APIRouter(tags=["meta"])
settings = get_settings()


@router.get("/api/v1/site", response_model=SitePublicOut)
async def site(db: AsyncSession = Depends(get_db)) -> SitePublicOut:
    row = await db.scalar(select(SiteSetting).where(SiteSetting.key == "public"))
    data = row.value if row else {}
    return SitePublicOut(
        name=data.get("name", settings.site_name),
        phone=data.get("phone", "+7 (950) 310-15-60"),
        whatsapp=data.get("whatsapp", "https://wa.me/79503101560"),
        telegram=data.get("telegram", "https://t.me/pr0gger/"),
        email=data.get("email", "stepanovpg@gmail.com"),
        city=data.get("city", "Казань"),
        reviews=data.get("reviews", []),
        faq=data.get("faq", []),
    )


@router.get("/api/v1/sitemap.xml")
async def sitemap_xml(db: AsyncSession = Depends(get_db)) -> Response:
    slugs = (
        await db.scalars(
            select(Product.slug).where(
                Product.deleted_at.is_(None),
                Product.is_active.is_(True),
                Product.type == ProductType.door_leaf,
            )
        )
    ).all()
    base = settings.site_url.rstrip("/")
    urls = [
        f"{base}/",
        f"{base}/catalog",
        f"{base}/delivery",
        f"{base}/legal",
        *[f"{base}/product/{slug}" for slug in slugs],
    ]
    body = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for url in urls:
        body.append(f"  <url><loc>{url}</loc></url>")
    body.append("</urlset>")
    return Response("\n".join(body), media_type="application/xml")
