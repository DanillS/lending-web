from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.db import SessionLocal, engine
from app.health import postgres_ok, redis_ok
from app.logging import request_id_ctx, setup_logging
from app.routers import admin, cart, catalog, meta
from app.services.seed import seed

settings = get_settings()
setup_logging(json_logs=settings.is_production)
logger = logging.getLogger("doors")


def _init_sentry() -> None:
    if not settings.sentry_dsn:
        return
    try:
        import sentry_sdk
    except ImportError:
        logger.warning("SENTRY_DSN is set but sentry-sdk is not installed")
        return
    sentry_sdk.init(dsn=settings.sentry_dsn, send_default_pii=False, traces_sample_rate=0.05)


def run_migrations() -> None:
    ini = Path(__file__).resolve().parents[1] / "alembic.ini"
    cfg = Config(str(ini))
    command.upgrade(cfg, "head")


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.validate_for_runtime()
    _init_sentry()
    run_migrations()
    async with SessionLocal() as session:
        await seed(session)
    if settings.is_production and not settings.telegram_configured:
        logger.warning("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID empty — new orders will not ping Telegram")
    if settings.is_production and not settings.vapid_configured:
        logger.warning("VAPID keys empty — web push keys will be stored in the database on first admin subscribe")
    yield
    await engine.dispose()


app = FastAPI(
    title="Doors API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_guards(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        origin = request.headers.get("origin")
        if origin and origin.rstrip("/") not in {item.rstrip("/") for item in settings.cors_origin_list}:
            return JSONResponse({"detail": "Недопустимый origin"}, status_code=403)
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
    token = request_id_ctx.set(request_id)
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
    finally:
        request_id_ctx.reset(token)


def _liveness() -> dict:
    return {"status": "ok"}


@app.get("/health")
async def health() -> dict:
    return _liveness()


@app.get("/health/live")
async def live() -> dict:
    return _liveness()


@app.get("/health/ready")
async def health_ready() -> JSONResponse:
    db_ok = await postgres_ok()
    cache_ok = await redis_ok()
    payload = {
        "status": "ok" if db_ok and cache_ok else "unhealthy",
        "postgres": db_ok,
        "redis": cache_ok,
        "telegram": settings.telegram_configured,
        "web_push": settings.vapid_configured,
    }
    return JSONResponse(payload, status_code=200 if db_ok and cache_ok else 503)


app.include_router(catalog.router)
app.include_router(cart.router)
app.include_router(admin.router)
app.include_router(meta.router)

upload_dir = Path(settings.upload_dir)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")
