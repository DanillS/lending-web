from types import SimpleNamespace

from app.services.notify import _order_telegram


def test_telegram_text_includes_number_and_phone():
    order = SimpleNamespace(
        public_number="KZ-100",
        customer_name="Иван",
        phone="+79990001122",
        address="г Казань, ул Баумана, д 1",
        comment="",
        total_snapshot=4500,
        items=[SimpleNamespace(title="Полотно", quantity=1, line_total=4500)],
    )
    text = _order_telegram(order)
    assert "KZ-100" in text
    assert "+79990001122" in text
    assert "Полотно" in text
    assert "Баумана" in text
