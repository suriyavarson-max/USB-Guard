from backend.app.platforms.windows.metadata_provider import parse_windows_pnp_id
from backend.app.platforms.common.device_normalizer import normalize_device_id, calculate_identity_confidence

def test_parse_windows_pnp_id():
    raw_pnp = r"USB\VID_0951&PID_1666\00187D0A2BEFF07187970F3A"
    meta = parse_windows_pnp_id(raw_pnp)
    assert meta["vendor_id"] == "0951"
    assert meta["product_id"] == "1666"
    assert meta["serial_number"] == "00187D0A2BEFF07187970F3A"

def test_windows_device_normalization():
    norm_id = normalize_device_id("windows", "pnp_raw", "0951", "1666", "SERIAL123")
    assert "windows:0951:1666:SERIAL123" == norm_id
    conf = calculate_identity_confidence("SERIAL123", "0951", "1666", "pnp_path")
    assert conf == "HIGH"
