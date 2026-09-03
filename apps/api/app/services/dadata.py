from __future__ import annotations

import logging

import httpx

from app.config import get_settings
from app.services import cache
from app.utils import normalize_phone

logger = logging.getLogger(__name__)

SUGGEST_URL = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address"
CLEAN_PHONE_URL = "https://cleaner.dadata.ru/api/v1/clean/phone"
TIMEOUT = httpx.Timeout(2.5, connect=1.5)
# Казань: подсказки по Татарстану выше, другие города не запрещены.
KAZAN_BOOST = [{"kladr_id": "1600000100000"}]
CACHE_TTL = 6 * 60 * 60
MIN_QUERY = 3


def _headers(secret: bool = False) -> dict[str, str]:
    settings = get_settings()
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Token {settings.dadata_api_key}",
    }
    if secret and settings.dadata_secret:
        headers["X-Secret"] = settings.dadata_secret
    return headers


async def suggest_address(query: str) -> list[dict[str, str]]:
    text = " ".join((query or "").split())
    if len(text) < MIN_QUERY:
        return []
    settings = get_settings()
    if not settings.dadata_api_key:
        return []
    cache_key = f"dadata:addr:{text.casefold()}"
    cached = await cache.get_json(cache_key)
    if isinstance(cached, list):
        return cached
    payload = {"query": text, "count": 7, "locations_boost": KAZAN_BOOST}
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(SUGGEST_URL, headers=_headers(), json=payload)
            if response.status_code >= 400:
                logger.warning("DaData suggest HTTP %s: %s", response.status_code, response.text[:200])
                return []
            body = response.json()
    except Exception:
        logger.exception("DaData suggest failed")
        return []
    items = []
    for row in body.get("suggestions") or []:
        value = (row.get("value") or "").strip()
        if not value:
            continue
        items.append(
            {
                "value": value,
                "unrestricted_value": (row.get("unrestricted_value") or value).strip(),
            }
        )
    await cache.set_json(cache_key, items, CACHE_TTL)
    return items


async def clean_phone(raw: str) -> str | None:
    settings = get_settings()
    if not settings.dadata_api_key or not settings.dadata_secret:
        return None
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                CLEAN_PHONE_URL,
                headers=_headers(secret=True),
                json=[raw],
            )
            if response.status_code >= 400:
                logger.warning("DaData phone HTTP %s: %s", response.status_code, response.text[:200])
                return None
            rows = response.json()
    except Exception:
        logger.exception("DaData phone failed")
        return None
    if not isinstance(rows, list) or not rows:
        return None
    phone = (rows[0] or {}).get("phone") or ""
    return normalize_phone(phone) or None


async def resolve_phone(raw: str) -> str:
    cleaned = await clean_phone(raw)
    return cleaned or normalize_phone(raw) or raw.strip()
