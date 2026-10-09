import sys
import platform
from dataclasses import dataclass

try:
    from pydantic import BaseModel
    class PlatformCapabilities(BaseModel):
        platform: str
        usb_native_events: bool = False
        usb_polling_fallback: bool = True
        volume_detection: bool = True
        file_monitoring: bool = True
        hashing: bool = True
        desktop_notifications: bool = False
        supports_device_serial: bool = True
        supports_mount_detection: bool = True
except ImportError:
    @dataclass
    class PlatformCapabilities:
        platform: str
        usb_native_events: bool = False
        usb_polling_fallback: bool = True
        volume_detection: bool = True
        file_monitoring: bool = True
        hashing: bool = True
        desktop_notifications: bool = False
        supports_device_serial: bool = True
        supports_mount_detection: bool = True

def detect_platform_capabilities() -> PlatformCapabilities:
    """Dynamically determine platform capabilities without assumptions."""
    plat_sys = platform.system().lower()
    
    if plat_sys == "windows":
        has_win32 = False
        try:
            import win32api # type: ignore
            has_win32 = True
        except ImportError:
            has_win32 = False
            
        return PlatformCapabilities(
            platform="windows",
            usb_native_events=has_win32,
            usb_polling_fallback=True,
            volume_detection=True,
            file_monitoring=True,
            hashing=True,
            desktop_notifications=has_win32,
            supports_device_serial=True,
            supports_mount_detection=True,
        )

    elif plat_sys == "linux":
        has_udev = False
        try:
            import pyudev # type: ignore
            has_udev = True
        except ImportError:
            has_udev = False

        return PlatformCapabilities(
            platform="linux",
            usb_native_events=has_udev,
            usb_polling_fallback=True,
            volume_detection=True,
            file_monitoring=True,
            hashing=True,
            desktop_notifications=False,
            supports_device_serial=True,
            supports_mount_detection=True,
        )

    elif plat_sys == "darwin":
        has_pyobjc = False
        try:
            import objc # type: ignore
            has_pyobjc = True
        except ImportError:
            has_pyobjc = False

        return PlatformCapabilities(
            platform="macos",
            usb_native_events=has_pyobjc,
            usb_polling_fallback=True,
            volume_detection=True,
            file_monitoring=True,
            hashing=True,
            desktop_notifications=False,
            supports_device_serial=True,
            supports_mount_detection=True,
        )

    else:
        return PlatformCapabilities(
            platform="unsupported",
            usb_native_events=False,
            usb_polling_fallback=True,
            volume_detection=False,
            file_monitoring=False,
            hashing=True,
            desktop_notifications=False,
            supports_device_serial=False,
            supports_mount_detection=False,
        )
