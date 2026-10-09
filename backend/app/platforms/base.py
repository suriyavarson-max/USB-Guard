from abc import ABC, abstractmethod
from typing import List, Optional, Callable, Dict, Any
from datetime import datetime
from dataclasses import dataclass, field

try:
    from pydantic import BaseModel
    class NormalizedUSBDevice(BaseModel):
        platform: str
        device_identifier: str
        device_name: str
        manufacturer: str = "Unknown"
        vendor_id: str = "0000"
        product_id: str = "0000"
        serial_number: Optional[str] = None
        device_type: str = "USB_STORAGE"
        transport: str = "USB"
        identity_confidence: str = "MEDIUM" # HIGH, MEDIUM, LOW
        status: str = "UNAUTHORIZED"
        risk_score: int = 40
        risk_level: str = "MEDIUM"
        raw_properties: Dict[str, Any] = {}

    class NormalizedVolume(BaseModel):
        volume_identifier: str
        device_id: Optional[int] = None
        mount_point: str
        filesystem: str = "FAT32"
        volume_label: str = "Removable Volume"
        capacity_bytes: int = 0
        free_bytes: int = 0
        read_only: bool = False
        raw_properties: Dict[str, Any] = {}

    class NormalizedEvent(BaseModel):
        event_type: str
        platform: str
        device: Optional[NormalizedUSBDevice] = None
        volume: Optional[NormalizedVolume] = None
        timestamp: datetime = datetime.utcnow()
        raw_event: Optional[Dict[str, Any]] = None

except ImportError:
    @dataclass
    class NormalizedUSBDevice:
        platform: str
        device_identifier: str
        device_name: str
        manufacturer: str = "Unknown"
        vendor_id: str = "0000"
        product_id: str = "0000"
        serial_number: Optional[str] = None
        device_type: str = "USB_STORAGE"
        transport: str = "USB"
        identity_confidence: str = "MEDIUM"
        status: str = "UNAUTHORIZED"
        risk_score: int = 40
        risk_level: str = "MEDIUM"
        raw_properties: Dict[str, Any] = field(default_factory=dict)

    @dataclass
    class NormalizedVolume:
        volume_identifier: str
        mount_point: str
        device_id: Optional[int] = None
        filesystem: str = "FAT32"
        volume_label: str = "Removable Volume"
        capacity_bytes: int = 0
        free_bytes: int = 0
        read_only: bool = False
        raw_properties: Dict[str, Any] = field(default_factory=dict)

    @dataclass
    class NormalizedEvent:
        event_type: str
        platform: str
        device: Optional[NormalizedUSBDevice] = None
        volume: Optional[NormalizedVolume] = None
        timestamp: datetime = field(default_factory=datetime.utcnow)
        raw_event: Optional[Dict[str, Any]] = None

class USBDeviceProvider(ABC):
    @abstractmethod
    def get_provider_name(self) -> str:
        pass

    @abstractmethod
    def list_devices(self) -> List[NormalizedUSBDevice]:
        pass

    @abstractmethod
    def watch_events(self, callback: Callable[[NormalizedEvent], None]) -> None:
        pass

    @abstractmethod
    def stop_watching(self) -> None:
        pass

class VolumeProvider(ABC):
    @abstractmethod
    def list_removable_volumes(self) -> List[NormalizedVolume]:
        pass

    @abstractmethod
    def watch_mount_events(self, callback: Callable[[NormalizedEvent], None]) -> None:
        pass

    @abstractmethod
    def stop_watching(self) -> None:
        pass
