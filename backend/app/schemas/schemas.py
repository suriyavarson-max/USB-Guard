from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# Platform & Capabilities
class PlatformCapabilities(BaseModel):
    platform: str
    usb_native_events: bool
    usb_polling_fallback: bool
    volume_detection: bool
    file_monitoring: bool
    hashing: bool
    desktop_notifications: bool
    supports_device_serial: bool
    supports_mount_detection: bool

class PlatformStatusResponse(BaseModel):
    platform: str
    platform_family: str
    architecture: str
    os_release: str
    provider: str
    monitoring_mode: str
    status: str
    fallback_active: bool
    capabilities: PlatformCapabilities

# Authentication
class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# USB Device
class USBDeviceBase(BaseModel):
    platform: str
    device_identifier: str
    identity_confidence: str
    device_name: str
    manufacturer: str
    vendor_id: str
    product_id: str
    serial_number: Optional[str] = None
    device_type: str = "USB_STORAGE"
    transport: str = "USB"
    status: str = "UNAUTHORIZED"
    risk_score: int = 40
    risk_level: str = "MEDIUM"

class USBDeviceOut(USBDeviceBase):
    id: int
    first_seen: datetime
    last_seen: datetime
    created_at: datetime
    updated_at: datetime
    connected_volumes: List[Any] = []
    active_connection: bool = False

    class Config:
        from_attributes = True

# Volumes
class USBVolumeOut(BaseModel):
    id: int
    device_id: Optional[int]
    volume_identifier: str
    mount_point: str
    filesystem: str
    volume_label: str
    capacity_bytes: int
    free_bytes: int
    read_only: bool
    mounted_at: datetime
    unmounted_at: Optional[datetime] = None
    is_active: bool
    device_name: Optional[str] = None

    class Config:
        from_attributes = True

# File Events
class FileEventOut(BaseModel):
    id: int
    volume_id: int
    relative_path: str
    event_type: str
    size_bytes: int
    sha256_hash: Optional[str] = None
    hash_status: str
    integrity_status: str
    timestamp: datetime
    is_demo: bool
    volume_mount_point: Optional[str] = None

    class Config:
        from_attributes = True

# Alerts
class AlertOut(BaseModel):
    id: int
    device_id: Optional[int]
    alert_type: str
    severity: str
    risk_score: int
    title: str
    description: str
    reasons_json: List[str] = []
    status: str
    timestamp: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    device_name: Optional[str] = None

    class Config:
        from_attributes = True

class AlertUpdate(BaseModel):
    status: str # ACKNOWLEDGED or RESOLVED

# Audit Logs
class AuditLogOut(BaseModel):
    id: int
    timestamp: datetime
    platform: str
    event_type: str
    actor: str
    device_identifier: Optional[str] = None
    description: str
    details_json: Dict[str, Any] = {}
    previous_hash: str
    record_hash: str

    class Config:
        from_attributes = True

class AuditIntegrityResponse(BaseModel):
    status: str # VALID or COMPROMISED
    is_valid: bool
    total_records: int
    verified_records: int
    tampered_index: Optional[int] = None
    latest_hash: Optional[str] = None
    message: str

# Demo Mode
class DemoEventRequest(BaseModel):
    demo_os: str = "linux" # windows, linux, macos
    event_type: str # USB_CONNECTED, USB_REMOVED, VOLUME_MOUNTED, FILE_CREATED, FILE_MODIFIED, HASH_CHANGED, etc.
    device_name: Optional[str] = "Synthetic Flash Drive"
    vendor_id: Optional[str] = "0951"
    product_id: Optional[str] = "1666"
    serial_number: Optional[str] = "SYNTH-USB-2026-X"
    mount_point: Optional[str] = None
    relative_path: Optional[str] = "Confidential/financial_records.xlsx"
    is_authorized: Optional[bool] = False

# Summary
class DashboardSummaryResponse(BaseModel):
    platform: str
    platform_family: str
    provider_name: str
    monitoring_mode: str
    provider_status: str
    total_devices: int
    connected_devices: int
    authorized_devices: int
    unauthorized_devices: int
    blocked_devices: int
    mounted_volumes: int
    total_file_events_today: int
    total_alerts: int
    critical_alerts: int
    average_risk_score: int
    audit_integrity_status: str
