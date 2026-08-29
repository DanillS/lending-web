import os

import pytest
from httpx import ASGITransport, AsyncClient

pytestmark = pytest.mark.skipif(os.environ.get("RUN_INTEGRATION") != "1", reason="RUN_INTEGRATION=1")


@pytest.fixture
async def client():
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_liveness(client: AsyncClient):
    for path in ("/health", "/health/live"):
        res = await client.get(path)
        assert res.status_code == 200
        assert res.json()["status"] == "ok"
        assert res.headers.get("x-request-id")


async def test_ready(client: AsyncClient):
    res = await client.get("/health/ready")
    assert res.status_code == 200
    body = res.json()
    assert body["postgres"] is True
    assert body["redis"] is True


async def test_openapi_and_catalog(client: AsyncClient):
    spec = await client.get("/openapi.json")
    assert spec.status_code == 200
    assert "/api/v1/products" in spec.json()["paths"]
    catalog = await client.get("/api/v1/products", params={"page_size": 5})
    assert catalog.status_code == 200
    data = catalog.json()
    assert data["total"] >= 1
    assert data["items"]


async def test_quote_standard_block(client: AsyncClient):
    catalog = await client.get("/api/v1/products", params={"type": "door_leaf", "page_size": 1})
    product_id = catalog.json()["items"][0]["id"]
    res = await client.post(
        "/api/v1/quote",
        json={
            "product_id": product_id,
            "size": "800x2000",
            "opening": "left",
            "kit": "standard_block",
            "hardware": "none",
            "services": [],
            "quantity": 1,
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["total"] > 0
    assert len(body["lines"]) >= 3
