import sys
import threading
import time
from typing import List, Callable, Optional, Dict
from backend.app.platforms.base import USBDeviceProvider, NormalizedUSBDevice, NormalizedEvent
from backend.app.platforms.common.device_normalizer import calculate_identity_confidence, normalize_device_id
from backend.app.platforms.windows.metadata_provider import parse_windows_pnp_id

class WindowsUSBProvider(USBDeviceProvider):
    def __init__(self, poll_interval: int = 2):
        self.poll_interval = poll_interval
        self._is_watching = False
        self._watcher_thread: Optional[threading.Thread] = None
        self._callback: Optional[Callable[[NormalizedEvent], None]] = None
        self._last_devices: Dict[str, NormalizedUSBDevice] = {}
        self._provider_name = "Windows Native PnP / WMI Adapter"

    def get_provider_name(self) -> str:
        return self._provider_name

    def list_devices(self) -> List[NormalizedUSBDevice]:
        """
        Enumerate USB devices on Windows using WMI or PowerShell PnP enumeration,
        with graceful fallback if libraries are missing.
        """
        devices: List[NormalizedUSBDevice] = []
        if not sys.platform.startswith("win"):
            return devices

        try:
            import wmi # type: ignore
            c = wmi.WMI()
            for item in c.Win32_PnPEntity():
                pnp_id = str(item.PNPDeviceID or "")
                if "USB" in pnp_id:
                    meta = parse_windows_pnp_id(pnp_id)
                    dev_name = str(item.Caption or item.Name or "Windows USB Device")
                    conf = calculate_identity_confidence(
                        serial_number=meta["serial_number"],
                        vendor_id=meta["vendor_id"],
                        product_id=meta["product_id"],
                        hardware_path=pnp_id
                    )
                    norm_id = normalize_device_id(
                        "windows",
                        pnp_id,
                        vendor_id=meta["vendor_id"],
                        product_id=meta["product_id"],
                        serial=meta["serial_number"]
                    )
                    devices.append(
                        NormalizedUSBDevice(
                            platform="windows",
                            device_identifier=norm_id,
                            device_name=dev_name,
                            manufacturer=str(item.Manufacturer or "Generic"),
                            vendor_id=meta["vendor_id"],
                            product_id=meta["product_id"],
                            serial_number=meta["serial_number"],
                            device_type="USB_STORAGE" if "STOR" in pnp_id.upper() or "DISK" in dev_name.upper() else "USB_PERIPHERAL",
                            transport="USB",
                            identity_confidence=conf,
                            status="UNAUTHORIZED",
                            raw_properties={"PNPDeviceID": pnp_id}
                        )
                    )
            return devices
        except Exception:
            # Fallback to empty list or PowerShell query
            return devices

    def watch_events(self, callback: Callable[[NormalizedEvent], None]) -> None:
        self._callback = callback
        self._is_watching = True
        # Seed initial state
        initial = self.list_devices()
        self._last_devices = {d.device_identifier: d for d in initial}
        
        self._watcher_thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._watcher_thread.start()

    def _poll_loop(self) -> None:
        while self._is_watching:
            try:
                current_devices = {d.device_identifier: d for d in self.list_devices()}
                # Check for newly connected
                for dev_id, dev in current_devices.items():
                    if dev_id not in self._last_devices:
                        if self._callback:
                            self._callback(
                                NormalizedEvent(
                                    event_type="DEVICE_CONNECTED",
                                    platform="windows",
                                    device=dev
                                )
                            )
                # Check for removed
                for dev_id, dev in self._last_devices.items():
                    if dev_id not in current_devices:
                        if self._callback:
                            self._callback(
                                NormalizedEvent(
                                    event_type="DEVICE_REMOVED",
                                    platform="windows",
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
