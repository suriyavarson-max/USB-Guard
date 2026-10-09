from backend.app.platforms.linux.metadata_provider import parse_linux_sysfs_device
from backend.app.platforms.common.device_normalizer import normalize_device_id, calculate_identity_confidence

def test_parse_linux_sysfs():
    props = {
        "ID_VENDOR_ID": "0781",
        "ID_MODEL_ID": "5583",
        "ID_SERIAL_SHORT": "4C530001090123115162",
        "DEVNAME": "/dev/sdb"
    }
    meta = parse_linux_sysfs_device(props)
    assert meta["vendor_id"] == "0781"
    assert meta["product_id"] == "5583"
    assert meta["serial_number"] == "4C530001090123115162"

def test_linux_device_normalization():
    norm_id = normalize_device_id("linux", "/sys/devices/pci0000/usb1", "0781", "5583", "SER_LINUX_1")
    assert "linux:0781:5583:SER_LINUX_1" == norm_id
