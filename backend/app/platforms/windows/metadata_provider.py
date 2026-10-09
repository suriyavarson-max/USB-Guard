import re
from typing import Dict, Any, Optional

def parse_windows_pnp_id(pnp_device_id: str) -> Dict[str, Optional[str]]:
    """
    Parses Windows Plug and Play ID strings such as:
    USB\\VID_0951&PID_1666\\00187D0A2BEFF07187970F3A
    Returns extracted vendor_id, product_id, and serial_number.
    """
    vid = None
    pid = None
    serial = None
    
    vid_match = re.search(r"VID_([0-9A-Fa-f]{4})", pnp_device_id)
    if vid_match:
        vid = vid_match.group(1).upper()
        
    pid_match = re.search(r"PID_([0-9A-Fa-f]{4})", pnp_device_id)
    if pid_match:
        pid = pid_match.group(1).upper()
        
    # Serial is typically after the final backslash
    parts = pnp_device_id.split("\\")
    if len(parts) >= 3 and "&" not in parts[-1]:
        serial = parts[-1]
        
    return {
        "vendor_id": vid or "0000",
        "product_id": pid or "0000",
        "serial_number": serial
    }
