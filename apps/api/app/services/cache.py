from __future__ import annotations

import json
import logging
import uuid
from typing import Any

from redis.asyncio import Redis

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
_redis: Redis | None = None


async def get_redis() -> Redis | None:
    global _redis
    if _redis is None:
        try:
            _redis = Redis.from_url(settings.redis_url, decode_responses=True)
            await _redis.ping()
        except Exception:
            logger.exception("Redis unavailable")
            _redis = None
    return _redis


async def rate_limited(key: str, limit: int, window_sec: int) -> bool:
    client = await get_redis()
    if client is None:
        return False
    pipe_key = f"rl:{key}"
    try:
        current = await client.incr(pipe_key)
        if current == 1:
            await client.expire(pipe_key, window_sec)
        return current > limit
    except Exception:
        logger.exception("rate limit failed")
        return False


def new_id() -> str:
    return uuid.uuid4().hex


async def get_json(key: str) -> Any | None:
    client = await get_redis()
    if client is None:
        return None
    try:
        raw = await client.get(key)
    except Exception:
        logger.exception("cache get failed")
        return None
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


async def set_json(key: str, value: Any, ttl: int) -> None:
    client = await get_redis()
    if client is None:
        return
    try:
        await client.set(key, json.dumps(value, ensure_ascii=False), ex=ttl)
    except Exception:
        logger.exception("cache set failed")
