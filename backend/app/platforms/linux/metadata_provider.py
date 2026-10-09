import re
from typing import Dict, Any, Optional

def parse_linux_sysfs_device(dev_properties: Dict[str, Any]) -> Dict[str, Optional[str]]:
    """
    Extracts normalized properties from Linux udev / sysfs device dictionary.
    """
    vid = dev_properties.get("ID_VENDOR_ID")
    if not vid and "PRODUCT" in dev_properties:
        prod_parts = str(dev_properties["PRODUCT"]).split("/")
        if len(prod_parts) >= 1:
            vid = prod_parts[0]
    if not vid:
        vid = "0000"

    pid = dev_properties.get("ID_MODEL_ID")
    if not pid and "PRODUCT" in dev_properties:
        prod_parts = str(dev_properties["PRODUCT"]).split("/")
        if len(prod_parts) >= 2:
            pid = prod_parts[1]
    if not pid:
        pid = "0000"

    serial = dev_properties.get("ID_SERIAL_SHORT") or dev_properties.get("ID_SERIAL")
    
    # Sanitize 4-digit hex
    vid_clean = re.sub(r"[^0-9A-Fa-f]", "", str(vid)).zfill(4)[-4:].upper()
    pid_clean = re.sub(r"[^0-9A-Fa-f]", "", str(pid)).zfill(4)[-4:].upper()
    
    return {
        "vendor_id": vid_clean,
        "product_id": pid_clean,
        "serial_number": serial
    }
