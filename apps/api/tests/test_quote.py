from app.schemas import HardwarePreset, KitType, QuoteRequest
from app.services.quote import SERVICE_SKU, SKU_CASING, SKU_FRAME, leaf_size_surcharge


def test_quote_request_defaults():
    payload = QuoteRequest(product_id="00000000-0000-0000-0000-000000000001")
    assert payload.kit == KitType.standard_block
    assert payload.hardware == HardwarePreset.none
    assert payload.quantity == 1


def test_service_map():
    assert SERVICE_SKU["install"]
    assert SKU_FRAME == "FRAME-STD"
    assert SKU_CASING == "CASING-STD"


def test_size_surcharge():
    assert leaf_size_surcharge(4050, "800x2000") == 0
    assert leaf_size_surcharge(4050, "600x2000") == 0
    assert leaf_size_surcharge(4050, "700x2000") == 0
    assert leaf_size_surcharge(4050, "900x2000") == max(500, round(4050 * 0.12))
    assert leaf_size_surcharge(1000, "900x2000") == 500
