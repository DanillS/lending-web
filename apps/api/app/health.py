from __future__ import annotations

from sqlalchemy import text

from app.db import engine
from app.services.cache import get_redis


async def postgres_ok() -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def redis_ok() -> bool:
    client = await get_redis()
    if client is None:
        return False
    try:
        await client.ping()
        return True
    except Exception:
        return False
