import os

import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.skipif(os.environ.get("RUN_INTEGRATION") != "1", reason="RUN_INTEGRATION=1")


@pytest.fixture
def client():
    from app.main import app

    with TestClient(app) as ac:
        yield ac


def test_liveness(client: TestClient):
    for path in ("/health", "/health/live"):
        res = client.get(path)
        assert res.status_code == 200
        assert res.json()["status"] == "ok"
        assert res.headers.get("x-request-id")


def test_ready(client: TestClient):
    res = client.get("/health/ready")
    assert res.status_code == 200
    body = res.json()
    assert body["postgres"] is True
    assert body["redis"] is True
    assert "dadata" in body


def test_openapi_and_catalog(client: TestClient):
    spec = client.get("/openapi.json")
    assert spec.status_code == 200
    assert "/api/v1/products" in spec.json()["paths"]
    catalog = client.get("/api/v1/products", params={"page_size": 5})
    assert catalog.status_code == 200
    data = catalog.json()
    assert data["total"] >= 1
    assert data["items"]


def test_quote_standard_block(client: TestClient):
    catalog = client.get("/api/v1/products", params={"type": "door_leaf", "page_size": 1})
    product_id = catalog.json()["items"][0]["id"]
    res = client.post(
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
