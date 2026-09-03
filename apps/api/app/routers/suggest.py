from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.schemas import (
    AddressSuggestIn,
    AddressSuggestItem,
    AddressSuggestOut,
    PhoneNormalizeIn,
    PhoneNormalizeOut,
)
from app.services import cache, dadata
from app.utils import is_valid_ru_phone

router = APIRouter(prefix="/api/v1", tags=["suggest"])


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/suggest/address", response_model=AddressSuggestOut)
async def suggest_address(payload: AddressSuggestIn, request: Request) -> AddressSuggestOut:
    if await cache.rate_limited(f"dadata-addr:{_client_ip(request)}", limit=20, window_sec=60):
        raise HTTPException(status_code=429, detail="Слишком много запросов")
    rows = await dadata.suggest_address(payload.query)
    return AddressSuggestOut(items=[AddressSuggestItem.model_validate(row) for row in rows])


@router.post("/phone/normalize", response_model=PhoneNormalizeOut)
async def normalize_phone_endpoint(payload: PhoneNormalizeIn, request: Request) -> PhoneNormalizeOut:
    if await cache.rate_limited(f"dadata-phone:{_client_ip(request)}", limit=20, window_sec=60):
        raise HTTPException(status_code=429, detail="Слишком много запросов")
    phone = await dadata.resolve_phone(payload.phone)
    return PhoneNormalizeOut(phone=phone, valid=is_valid_ru_phone(phone))
