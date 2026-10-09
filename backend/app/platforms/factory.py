import sys
import platform
from typing import Tuple, List, Callable, Optional
from backend.app.platforms.base import (
    USBDeviceProvider,
    VolumeProvider,
    NormalizedUSBDevice,
    NormalizedVolume,
    NormalizedEvent
)
from backend.app.platforms.windows.usb_provider import WindowsUSBProvider
from backend.app.platforms.windows.volume_provider import WindowsVolumeProvider
from backend.app.platforms.linux.usb_provider import LinuxUSBProvider
from backend.app.platforms.linux.volume_provider import LinuxVolumeProvider
from backend.app.platforms.macos.usb_provider import MacOSUSBProvider
from backend.app.platforms.macos.volume_provider import MacOSVolumeProvider

class UnsupportedUSBProvider(USBDeviceProvider):
    def get_provider_name(self) -> str:
        return f"Unsupported Platform Provider ({platform.system()})"

    def list_devices(self) -> List[NormalizedUSBDevice]:
        return []

    def watch_events(self, callback: Callable[[NormalizedEvent], None]) -> None:
        pass

    def stop_watching(self) -> None:
        pass

class UnsupportedVolumeProvider(VolumeProvider):
    def list_removable_volumes(self) -> List[NormalizedVolume]:
        return []

    def watch_mount_events(self, callback: Callable[[NormalizedEvent], None]) -> None:
        pass

    def stop_watching(self) -> None:
        pass

class MockUSBProvider(USBDeviceProvider):
    """Used for cross-platform simulation and unit testing on non-native OS."""
    def __init__(self, platform_name: str = "linux"):
        self.platform_name = platform_name
        self._provider_name = f"Mock {platform_name.capitalize()} Provider (Simulation)"
        self._devices: List[NormalizedUSBDevice] = []

    def get_provider_name(self) -> str:
        return self._provider_name

    def list_devices(self) -> List[NormalizedUSBDevice]:
        return list(self._devices)

    def set_devices(self, devices: List[NormalizedUSBDevice]) -> None:
        self._devices = devices

    def watch_events(self, callback: Callable[[NormalizedEvent], None]) -> None:
        pass

    def stop_watching(self) -> None:
        pass

class MockVolumeProvider(VolumeProvider):
    def __init__(self):
        self._volumes: List[NormalizedVolume] = []

    def list_removable_volumes(self) -> List[NormalizedVolume]:
        return list(self._volumes)

    def set_volumes(self, volumes: List[NormalizedVolume]) -> None:
        self._volumes = volumes

    def watch_mount_events(self, callback: Callable[[NormalizedEvent], None]) -> None:
        pass

    def stop_watching(self) -> None:
        pass

def get_platform_adapter(force_platform: Optional[str] = None) -> Tuple[USBDeviceProvider, VolumeProvider, str]:
    """
    Automatic Platform Detection & Provider Factory.
    Returns: (usb_provider, volume_provider, detected_platform_name)
    """
    target = force_platform.lower() if force_platform else platform.system().lower()

    if target.startswith("win"):
        return WindowsUSBProvider(), WindowsVolumeProvider(), "windows"
    elif target.startswith("linux"):
        return LinuxUSBProvider(), LinuxVolumeProvider(), "linux"
    elif target.startswith("darwin") or target.startswith("mac"):
        return MacOSUSBProvider(), MacOSVolumeProvider(), "macos"
    else:
        return UnsupportedUSBProvider(), UnsupportedVolumeProvider(), "unsupported"
