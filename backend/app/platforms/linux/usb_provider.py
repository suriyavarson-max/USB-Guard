import sys
import os
import threading
import time
from pathlib import Path
from typing import List, Callable, Optional, Dict
from backend.app.platforms.base import USBDeviceProvider, NormalizedUSBDevice, NormalizedEvent
from backend.app.platforms.common.device_normalizer import calculate_identity_confidence, normalize_device_id
from backend.app.platforms.linux.metadata_provider import parse_linux_sysfs_device

class LinuxUSBProvider(USBDeviceProvider):
    def __init__(self, poll_interval: int = 2):
        self.poll_interval = poll_interval
        self._is_watching = False
        self._watcher_thread: Optional[threading.Thread] = None
        self._callback: Optional[Callable[[NormalizedEvent], None]] = None
        self._last_devices: Dict[str, NormalizedUSBDevice] = {}
        self._provider_name = "Linux pyudev / sysfs Adapter"
        self._has_pyudev = False

        try:
            import pyudev # type: ignore
            self._has_pyudev = True
            self._provider_name = "Linux Native pyudev Adapter"
        except ImportError:
            self._has_pyudev = False
            self._provider_name = "Linux sysfs Polling Adapter"

    def get_provider_name(self) -> str:
        return self._provider_name

    def list_devices(self) -> List[NormalizedUSBDevice]:
        """Enumerate connected USB devices on Linux via pyudev or /sys/bus/usb/devices."""
        devices: List[NormalizedUSBDevice] = []
        if not sys.platform.startswith("linux"):
            return devices

        if self._has_pyudev:
            try:
                import pyudev # type: ignore
                context = pyudev.Context()
                for device in context.list_devices(subsystem="usb", devtype="usb_device"):
                    props = dict(device.properties)
                    meta = parse_linux_sysfs_device(props)
                    raw_path = device.device_path or device.sys_path or "usb_unknown"
                    dev_name = props.get("ID_MODEL_FROM_DATABASE") or props.get("ID_MODEL") or device.get("PRODUCT") or "Linux USB Device"
                    mfg = props.get("ID_VENDOR_FROM_DATABASE") or props.get("ID_VENDOR") or "Generic"
                    
                    conf = calculate_identity_confidence(
                        serial_number=meta["serial_number"],
                        vendor_id=meta["vendor_id"],
                        product_id=meta["product_id"],
                        hardware_path=raw_path
                    )
                    norm_id = normalize_device_id(
                        "linux",
                        raw_path,
                        vendor_id=meta["vendor_id"],
                        product_id=meta["product_id"],
                        serial=meta["serial_number"]
                    )
                    is_storage = "storage" in (props.get("DEVTYPE") or "").lower() or any(
                        "usb-storage" in child.driver or "" for child in device.children if hasattr(child, "driver") and child.driver
                    )
                    devices.append(
                        NormalizedUSBDevice(
                            platform="linux",
                            device_identifier=norm_id,
                            device_name=dev_name,
                            manufacturer=mfg,
                            vendor_id=meta["vendor_id"],
                            product_id=meta["product_id"],
                            serial_number=meta["serial_number"],
                            device_type="USB_STORAGE" if is_storage else "USB_PERIPHERAL",
                            transport="USB",
                            identity_confidence=conf,
                            status="UNAUTHORIZED",
                            raw_properties={"sys_path": raw_path}
                        )
                    )
                return devices
            except Exception:
                pass

        # Fallback to sysfs direct inspection
        try:
            sys_usb = Path("/sys/bus/usb/devices")
            if sys_usb.exists():
                for dev_dir in sys_usb.iterdir():
                    if ":" not in dev_dir.name and (dev_dir / "idVendor").exists():
                        try:
                            vid = (dev_dir / "idVendor").read_text().strip().upper()
                            pid = (dev_dir / "idProduct").read_text().strip().upper()
                            serial = (dev_dir / "serial").read_text().strip() if (dev_dir / "serial").exists() else None
                            mfg = (dev_dir / "manufacturer").read_text().strip() if (dev_dir / "manufacturer").exists() else "Generic"
                            prod = (dev_dir / "product").read_text().strip() if (dev_dir / "product").exists() else dev_dir.name
                            
                            conf = calculate_identity_confidence(serial, vid, pid, dev_dir.name)
                            norm_id = normalize_device_id("linux", dev_dir.name, vid, pid, serial)
                            
                            devices.append(
                                NormalizedUSBDevice(
                                    platform="linux",
                                    device_identifier=norm_id,
                                    device_name=prod,
                                    manufacturer=mfg,
                                    vendor_id=vid,
                                    product_id=pid,
                                    serial_number=serial,
                                    device_type="USB_STORAGE",
                                    transport="USB",
                                    identity_confidence=conf,
                                    status="UNAUTHORIZED",
                                    raw_properties={"dev_name": dev_dir.name}
                                )
                            )
                        except Exception:
                            continue
        except Exception:
            pass

        return devices

    def watch_events(self, callback: Callable[[NormalizedEvent], None]) -> None:
        self._callback = callback
        self._is_watching = True
        initial = self.list_devices()
        self._last_devices = {d.device_identifier: d for d in initial}

        self._watcher_thread = threading.Thread(target=self._watch_loop, daemon=True)
        self._watcher_thread.start()

    def _watch_loop(self) -> None:
        # Polling fallback watcher (and handles pyudev monitor if available)
        while self._is_watching:
            try:
                current_devices = {d.device_identifier: d for d in self.list_devices()}
                for dev_id, dev in current_devices.items():
                    if dev_id not in self._last_devices:
                        if self._callback:
                            self._callback(
                                NormalizedEvent(
                                    event_type="DEVICE_CONNECTED",
                                    platform="linux",
                                    device=dev
                                )
                            )
                for dev_id, dev in self._last_devices.items():
                    if dev_id not in current_devices:
                        if self._callback:
                            self._callback(
                                NormalizedEvent(
                                    event_type="DEVICE_REMOVED",
                                    platform="linux",
                                    device=dev
                                )
                            )
                self._last_devices = current_devices
            except Exception:
                pass
            time.sleep(self.poll_interval)

    def stop_watching(self) -> None:
        self._is_watching = False
        if self._watcher_thread and self._watcher_thread.is_alive():
            self._watcher_thread.join(timeout=1.0)
