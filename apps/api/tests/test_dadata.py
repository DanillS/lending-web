from unittest.mock import AsyncMock, patch

import httpx

from app.config import Settings
from app.services import dadata


def test_dadata_flag():
    empty = Settings()
    assert empty.dadata_configured is False
    ready = Settings(dadata_api_key="token")
    assert ready.dadata_configured is True


async def test_suggest_empty_without_key():
    with patch("app.services.dadata.get_settings", return_value=Settings(dadata_api_key="")):
        assert await dadata.suggest_address("Казань Баумана") == []


async def test_suggest_short_query_skips_http():
    with patch("app.services.dadata.get_settings", return_value=Settings(dadata_api_key="tok")):
        with patch("app.services.dadata.httpx.AsyncClient") as client_cls:
            assert await dadata.suggest_address("ка") == []
            client_cls.assert_not_called()


async def test_suggest_parses_dadata_payload():
    settings = Settings(dadata_api_key="tok")
    response = httpx.Response(
        200,
        json={
            "suggestions": [
                {
                    "value": "г Казань, ул Баумана, д 1",
                    "unrestricted_value": "420111, Респ Татарстан, г Казань, ул Баумана, д 1",
                }
            ]
        },
    )
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=response)
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = False

    with (
        patch("app.services.dadata.get_settings", return_value=settings),
        patch("app.services.dadata.cache.get_json", new=AsyncMock(return_value=None)),
        patch("app.services.dadata.cache.set_json", new=AsyncMock()) as set_json,
        patch("app.services.dadata.httpx.AsyncClient", return_value=mock_client),
    ):
        items = await dadata.suggest_address("казань баумана 1")
    assert items[0]["value"].startswith("г Казань")
    set_json.assert_awaited()
    sent = mock_client.post.await_args
    assert sent.args[0] == dadata.SUGGEST_URL
    assert sent.kwargs["json"]["locations_boost"] == dadata.KAZAN_BOOST


async def test_suggest_degrades_on_timeout():
    settings = Settings(dadata_api_key="tok")
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("slow"))
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = False

    with (
        patch("app.services.dadata.get_settings", return_value=settings),
        patch("app.services.dadata.cache.get_json", new=AsyncMock(return_value=None)),
        patch("app.services.dadata.httpx.AsyncClient", return_value=mock_client),
    ):
        assert await dadata.suggest_address("Казань") == []


async def test_resolve_phone_falls_back_without_secret():
    with patch("app.services.dadata.get_settings", return_value=Settings(dadata_api_key="tok", dadata_secret="")):
        assert await dadata.resolve_phone("8 (950) 310-15-60") == "+79503101560"


async def test_clean_phone_uses_dadata_when_secret_set():
    settings = Settings(dadata_api_key="tok", dadata_secret="sec")
    response = httpx.Response(200, json=[{"phone": "+7 916 823-29-29"}])
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=response)
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = False

    with (
        patch("app.services.dadata.get_settings", return_value=settings),
        patch("app.services.dadata.httpx.AsyncClient", return_value=mock_client),
    ):
        assert await dadata.resolve_phone("89168232929") == "+79168232929"
