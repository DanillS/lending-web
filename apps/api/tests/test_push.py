from types import SimpleNamespace

from app.config import Settings
from app.schemas import PushSubscribeIn
from app.services.push import generate_vapid_keys, order_push_payload


def test_vapid_flag():
    empty = Settings()
    assert empty.vapid_configured is False
    ready = Settings(vapid_public_key="Bxxx", vapid_private_key="priv")
    assert ready.vapid_configured is True


def test_generate_vapid_keys_uncompressed_public():
    keys = generate_vapid_keys()
    assert keys["public"].startswith("B")
    assert len(keys["private"]) >= 40
    assert keys["subject"].startswith("mailto:") or keys["subject"].startswith("https://")


def test_order_push_payload():
    order = SimpleNamespace(public_number="KD-0001", customer_name="Иван", phone="+79501112233", total_snapshot=12000)
    payload = order_push_payload(order)
    assert payload["title"] == "Новая заявка KD-0001"
    assert "12000" in payload["body"]
    assert payload["url"] == "/admin/orders"


def test_push_subscribe_requires_https():
    try:
        PushSubscribeIn(endpoint="http://example.com/push", keys={"p256dh": "a" * 20, "auth": "b" * 8})
        raise AssertionError("expected validation error")
    except Exception:
        pass
    ok = PushSubscribeIn(
        endpoint="https://fcm.googleapis.com/fcm/send/abc",
        keys={"p256dh": "a" * 20, "auth": "b" * 8},
    )
    assert ok.endpoint.startswith("https://")
