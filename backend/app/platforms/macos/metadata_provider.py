import re
from typing import Dict, Any, Optional

def parse_macos_system_profiler_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parses an item from macOS SPUSBDataType tree into normalized properties.
    """
    name = item.get("_name", "macOS USB Device")
    mfg = item.get("manufacturer", "Apple / Generic")
    serial = item.get("serial_num")
    
    # Vendor and Product ID strings in system_profiler can be like: '0x0951 (Kingston Technology)'
    raw_vid = item.get("vendor_id", "0x0000")
    raw_pid = item.get("product_id", "0x0000")
    
    vid_match = re.search(r"0x([0-9A-Fa-f]{4})", str(raw_vid))
    vid = vid_match.group(1).upper() if vid_match else "0000"
    
    pid_match = re.search(r"0x([0-9A-Fa-f]{4})", str(raw_pid))
    pid = pid_match.group(1).upper() if pid_match else "0000"
    
    is_storage = "storage" in name.lower() or "Media" in item
    
    return {
        "device_name": name,
        "manufacturer": mfg,
        "vendor_id": vid,
        "product_id": pid,
        "serial_number": serial,
        "is_storage": is_storage,
    }
