from backend.app.platforms.macos.metadata_provider import parse_macos_system_profiler_item
from backend.app.platforms.common.device_normalizer import normalize_device_id, calculate_identity_confidence

def test_parse_macos_system_profiler():
    item = {
        "_name": "Ultra Flash Drive",
        "manufacturer": "SanDisk",
        "vendor_id": "0x0781 (SanDisk Corp.)",
        "product_id": "0x5583",
        "serial_num": "4C5311223344",
        "location_id": "0x14100000 / 1"
    }
    meta = parse_macos_system_profiler_item(item)
    assert meta["device_name"] == "Ultra Flash Drive"
    assert meta["vendor_id"] == "0781"
    assert meta["product_id"] == "5583"
    assert meta["serial_number"] == "4C5311223344"

def test_macos_device_normalization():
    norm_id = normalize_device_id("macos", "0x14100000", "0781", "5583", "4C5311223344")
    assert "macos:0781:5583:4C5311223344" == norm_id
