from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import get_settings
from app.db import SessionLocal, engine
from app.models import Base
from app.routers import admin, cart, catalog, meta
from app.services.seed import seed

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("doors")
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(
            text(
                """
                CREATE OR REPLACE FUNCTION products_search_update() RETURNS trigger AS $$
                BEGIN
                  NEW.search_vector :=
                    setweight(to_tsvector('russian', coalesce(NEW.name, '')), 'A') ||
                    setweight(to_tsvector('russian', coalesce(NEW.description, '')), 'B') ||
                    setweight(to_tsvector('russian', coalesce(NEW.manufacturer, '')), 'C');
                  RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
                """
            )
        )
        await conn.execute(text("DROP TRIGGER IF EXISTS trg_products_search ON products"))
        await conn.execute(
            text(
                """
                CREATE TRIGGER trg_products_search
                BEFORE INSERT OR UPDATE OF name, description, manufacturer ON products
                FOR EACH ROW EXECUTE FUNCTION products_search_update();
                """
              )
        )
    async with SessionLocal() as session:
        await seed(session)
    yield
    await engine.dispose()


app = FastAPI(title="Doors API", version="1.0.0", lifespan=lifespan)

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
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


app.include_router(catalog.router)
app.include_router(cart.router)
app.include_router(admin.router)
app.include_router(meta.router)

upload_dir = Path(settings.upload_dir)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")
