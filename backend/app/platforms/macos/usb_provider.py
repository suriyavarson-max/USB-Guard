import sys
import json
import subprocess
import threading
import time
from typing import List, Callable, Optional, Dict
from backend.app.platforms.base import USBDeviceProvider, NormalizedUSBDevice, NormalizedEvent
from backend.app.platforms.common.device_normalizer import calculate_identity_confidence, normalize_device_id
from backend.app.platforms.macos.metadata_provider import parse_macos_system_profiler_item

class MacOSUSBProvider(USBDeviceProvider):
    def __init__(self, poll_interval: int = 3):
        self.poll_interval = poll_interval
        self._is_watching = False
        self._watcher_thread: Optional[threading.Thread] = None
        self._callback: Optional[Callable[[NormalizedEvent], None]] = None
        self._last_devices: Dict[str, NormalizedUSBDevice] = {}
        self._provider_name = "macOS IOKit / system_profiler Adapter"
        self._has_pyobjc = False

        try:
            import objc # type: ignore
            self._has_pyobjc = True
            self._provider_name = "macOS Native IOKit Adapter"
        except ImportError:
            self._has_pyobjc = False
            self._provider_name = "macOS system_profiler Polling Adapter"

    def get_provider_name(self) -> str:
        return self._provider_name

    def list_devices(self) -> List[NormalizedUSBDevice]:
        """Enumerate connected USB devices on macOS."""
        devices: List[NormalizedUSBDevice] = []
        if not sys.platform.startswith("darwin"):
            return devices

        try:
            cmd = ["system_profiler", "SPUSBDataType", "-json", "-detailLevel", "basic"]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if res.returncode == 0 and res.stdout:
                data = json.loads(res.stdout)
                root_items = data.get("SPUSBDataType", [])

                def walk_tree(items):
                    for item in items:
                        meta = parse_macos_system_profiler_item(item)
                        raw_id = item.get("location_id") or meta["device_name"]
                        conf = calculate_identity_confidence(
                            serial_number=meta["serial_number"],
                            vendor_id=meta["vendor_id"],
                            product_id=meta["product_id"],
                            hardware_path=raw_id
                        )
                        norm_id = normalize_device_id(
                            "macos",
                            raw_id,
                            vendor_id=meta["vendor_id"],
                            product_id=meta["product_id"],
                            serial=meta["serial_number"]
                        )
                        devices.append(
                            NormalizedUSBDevice(
                                platform="macos",
                                device_identifier=norm_id,
                                device_name=meta["device_name"],
                                manufacturer=meta["manufacturer"],
                                vendor_id=meta["vendor_id"],
                                product_id=meta["product_id"],
                                serial_number=meta["serial_number"],
                                device_type="USB_STORAGE" if meta["is_storage"] else "USB_PERIPHERAL",
                                transport="USB",
                                identity_confidence=conf,
                                status="UNAUTHORIZED",
                                raw_properties={"location_id": raw_id}
                            )
                        )
                        if "_items" in item:
                            walk_tree(item["_items"])

                walk_tree(root_items)
                return devices
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
        while self._is_watching:
            try:
                current_devices = {d.device_identifier: d for d in self.list_devices()}
                for dev_id, dev in current_devices.items():
                    if dev_id not in self._last_devices:
                        if self._callback:
                            self._callback(
                                NormalizedEvent(
                                    event_type="DEVICE_CONNECTED",
                                    platform="macos",
                                    device=dev
                                )
                            )
                for dev_id, dev in self._last_devices.items():
                    if dev_id not in current_devices:
                        if self._callback:
                            self._callback(
                                NormalizedEvent(
                                    event_type="DEVICE_REMOVED",
                                    platform="macos",
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
