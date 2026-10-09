import re
from typing import Optional, Tuple

def calculate_identity_confidence(
    serial_number: Optional[str],
    vendor_id: Optional[str],
    product_id: Optional[str],
    hardware_path: Optional[str]
) -> str:
    """
    Computes Identity Confidence level:
    - HIGH: Unique hardware Serial + valid Vendor/Product ID + OS Hardware Identifier
    - MEDIUM: Valid Vendor/Product ID + Persistent OS Port/Path, but missing or generic Serial
    - LOW: Ephemeral display name only or generic fallback
    """
    valid_vid = bool(vendor_id and vendor_id not in ("0000", "000", "", "None"))
    valid_pid = bool(product_id and product_id not in ("0000", "000", "", "None"))
    valid_serial = bool(
        serial_number and 
        len(serial_number.strip()) >= 4 and 
        serial_number.strip() not in ("00000000", "0", "None", "Unknown")
    )
    
    if valid_serial and valid_vid and valid_pid:
        return "HIGH"
    elif valid_vid and valid_pid and hardware_path:
        return "MEDIUM"
    elif valid_vid or hardware_path:
        return "MEDIUM"
    return "LOW"

def normalize_device_id(platform_name: str, raw_id: str, vendor_id: str = "0000", product_id: str = "0000", serial: Optional[str] = None) -> str:
    """
    Constructs a normalized, stable, URL-safe and DB-safe device identifier.
    Guarantees cross-platform consistency and eliminates special OS escape sequences.
    """
    clean_platform = platform_name.lower().strip()
    clean_vid = re.sub(r"[^a-zA-Z0-9]", "", vendor_id or "0000").zfill(4)[-4:].upper()
    clean_pid = re.sub(r"[^a-zA-Z0-9]", "", product_id or "0000").zfill(4)[-4:].upper()
    
    if serial and len(serial.strip()) >= 4:
        clean_serial = re.sub(r"[^a-zA-Z0-9_-]", "", serial.strip())
        return f"{clean_platform}:{clean_vid}:{clean_pid}:{clean_serial}"
    
    clean_raw = re.sub(r"[^a-zA-Z0-9_-]", "_", raw_id.strip())
    # Truncate if excessively long
    if len(clean_raw) > 64:
        clean_raw = clean_raw[-64:]
    return f"{clean_platform}:{clean_vid}:{clean_pid}:{clean_raw}"
