import sys
import threading
import time
from typing import List, Callable, Optional, Dict
from backend.app.platforms.base import VolumeProvider, NormalizedVolume, NormalizedEvent
from backend.app.platforms.common.volume_detector import detect_mounted_volumes_cross_platform

class MacOSVolumeProvider(VolumeProvider):
    def __init__(self, poll_interval: int = 2):
        self.poll_interval = poll_interval
        self._is_watching = False
        self._thread: Optional[threading.Thread] = None
        self._callback: Optional[Callable[[NormalizedEvent], None]] = None
        self._last_volumes: Dict[str, NormalizedVolume] = {}

    def list_removable_volumes(self) -> List[NormalizedVolume]:
        """Lists removable storage volumes mounted on macOS under /Volumes/."""
        return detect_mounted_volumes_cross_platform()

    def watch_mount_events(self, callback: Callable[[NormalizedEvent], None]) -> None:
        self._callback = callback
        self._is_watching = True
        initial = self.list_removable_volumes()
        self._last_volumes = {v.volume_identifier: v for v in initial}

        self._thread = threading.Thread(target=self._watch_loop, daemon=True)
        self._thread.start()

    def _watch_loop(self) -> None:
        while self._is_watching:
            try:
                current_vols = {v.volume_identifier: v for v in self.list_removable_volumes()}
                for v_id, vol in current_vols.items():
                    if v_id not in self._last_volumes:
                        if self._callback:
                            self._callback(
                                NormalizedEvent(
                                    event_type="VOLUME_MOUNTED",
                                    platform="macos",
                                    volume=vol
                                )
                            )
                for v_id, vol in self._last_volumes.items():
                    if v_id not in current_vols:
                        if self._callback:
                            self._callback(
                                NormalizedEvent(
                                    event_type="VOLUME_UNMOUNTED",
                                    platform="macos",
                                    volume=vol
                                )
                            )
                self._last_volumes = current_vols
            except Exception:
                pass
            time.sleep(self.poll_interval)

    def stop_watching(self) -> None:
        self._is_watching = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)
