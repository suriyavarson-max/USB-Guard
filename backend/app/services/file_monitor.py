import sys
import os
import threading
import time
from pathlib import Path
from typing import Dict, Optional, Callable
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal
from backend.app.models.models import FileEvent, FileBaseline, USBVolume
from backend.app.services.hash_service import calculate_sha256
from backend.app.platforms.common.platform_utils import normalize_relative_path, is_path_safe_within_root

class VolumeFileObserver:
    """Monitors file changes inside a specific mounted removable USB volume."""
    def __init__(self, volume_id: int, mount_point: str, on_event: Optional[Callable] = None):
        self.volume_id = volume_id
        self.mount_path = Path(mount_point)
        self.on_event = on_event
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._watchdog_observer = None
        self._file_cache: Dict[str, float] = {}

    def start(self) -> None:
        if not self.mount_path.exists() or not self.mount_path.is_dir():
            return
        self._running = True
        
        # Try watchdog
        try:
            from watchdog.observers import Observer # type: ignore
            from watchdog.events import FileSystemEventHandler # type: ignore

            class Handler(FileSystemEventHandler):
                def __init__(outer_self):
                    super().__init__()
                    outer_self.parent = self

                def on_created(outer_self, event):
                    if not event.is_directory:
                        self._handle_file_change(Path(event.src_path), "CREATED")

                def on_modified(outer_self, event):
                    if not event.is_directory:
                        self._handle_file_change(Path(event.src_path), "MODIFIED")

                def on_deleted(outer_self, event):
                    if not event.is_directory:
                        self._handle_file_change(Path(event.src_path), "DELETED")

                def on_moved(outer_self, event):
                    if not event.is_directory:
                        self._handle_file_change(Path(event.dest_path), "RENAMED")

            self._watchdog_observer = Observer()
            self._watchdog_observer.schedule(Handler(), str(self.mount_path), recursive=True)
            self._watchdog_observer.start()
            return
        except Exception:
            pass

        # Fallback to polling thread
        self._thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._thread.start()

    def _poll_loop(self) -> None:
        while self._running:
            try:
                if not self.mount_path.exists():
                    break
                current_files: Dict[str, float] = {}
                for p in self.mount_path.glob("**/*"):
                    if p.is_file():
                        try:
                            rel = normalize_relative_path(self.mount_path, p)
                            mtime = p.stat().st_mtime
                            current_files[rel] = mtime
                            
                            if rel not in self._file_cache:
                                self._handle_file_change(p, "CREATED")
                            elif mtime > self._file_cache[rel]:
                                self._handle_file_change(p, "MODIFIED")
                        except Exception:
                            continue
                for rel in list(self._file_cache.keys()):
                    if rel not in current_files:
                        self._handle_file_change(self.mount_path / rel, "DELETED")
                self._file_cache = current_files
            except Exception:
                pass
            time.sleep(2.0)

    def _handle_file_change(self, file_path: Path, event_type: str) -> None:
        """Processes file event, computes SHA-256, verifies baseline, and updates database."""
        if not is_path_safe_within_root(self.mount_path, file_path):
            return

        rel_path = normalize_relative_path(self.mount_path, file_path)
        # Skip temporary OS hidden files
        if rel_path.startswith((".Spotlight", ".fseventsd", ".Trashes", "System Volume Information", "~$")):
            return

        db: Session = SessionLocal()
        try:
            size_bytes = 0
            sha256_hash = None
            hash_status = "NOT_AVAILABLE"
            integrity_status = "UNVERIFIED"

            if event_type in ("CREATED", "MODIFIED", "RENAMED") and file_path.exists():
                h_res = calculate_sha256(file_path)
                sha256_hash = h_res.sha256
                hash_status = h_res.status
                size_bytes = h_res.size_bytes

                # Check or update baseline
                baseline = db.query(FileBaseline).filter(
                    FileBaseline.volume_id == self.volume_id,
                    FileBaseline.relative_path == rel_path
                ).first()

                if baseline:
                    if baseline.sha256_hash == sha256_hash:
                        integrity_status = "INTEGRITY_OK"
                        baseline.last_verified = datetime.utcnow()
                    else:
                        integrity_status = "INTEGRITY_CHANGED"
                else:
                    if sha256_hash:
                        baseline = FileBaseline(
                            volume_id=self.volume_id,
                            relative_path=rel_path,
                            size_bytes=size_bytes,
                            sha256_hash=sha256_hash,
                            first_seen=datetime.utcnow(),
                            last_verified=datetime.utcnow()
                        )
                        db.add(baseline)
                        integrity_status = "INTEGRITY_OK"

            event_record = FileEvent(
                volume_id=self.volume_id,
                relative_path=rel_path,
                event_type=event_type,
                size_bytes=size_bytes,
                sha256_hash=sha256_hash,
                hash_status=hash_status,
                integrity_status=integrity_status,
                timestamp=datetime.utcnow(),
                is_demo=False
            )
            db.add(event_record)
            db.commit()
            db.refresh(event_record)

            if self.on_event:
                self.on_event(event_record)
        except Exception:
            db.rollback()
        finally:
            db.close()

    def stop(self) -> None:
        self._running = False
        if self._watchdog_observer:
            try:
                self._watchdog_observer.stop()
                self._watchdog_observer.join(timeout=1.0)
            except Exception:
                pass
