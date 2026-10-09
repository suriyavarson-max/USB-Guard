import logging
from typing import Dict, Optional, Callable
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal
from backend.app.models.models import (
    USBDevice,
    USBConnection,
    USBVolume,
    Alert,
    AuditLog,
    PlatformEvent
)
from backend.app.platforms.factory import get_platform_adapter
from backend.app.platforms.base import (
    USBDeviceProvider,
    VolumeProvider,
    NormalizedUSBDevice,
    NormalizedVolume,
    NormalizedEvent
)
from backend.app.services.risk_engine import calculate_device_risk
from backend.app.services.alert_service import create_security_alert
from backend.app.services.audit_service import record_audit_event
from backend.app.services.file_monitor import VolumeFileObserver

logger = logging.getLogger("usb_security.monitor")

class USBMonitorService:
    """
    Common Orchestration Service for USB Device and Removable Volume Security.
    Operating-system independent business logic.
    """
    _instance: Optional["USBMonitorService"] = None

    def __init__(self, force_platform: Optional[str] = None):
        self.force_platform = force_platform
        self.usb_provider, self.volume_provider, self.platform_name = get_platform_adapter(force_platform)
        self.file_observers: Dict[int, VolumeFileObserver] = {}
        self._is_active = False
        self.on_broadcast: Optional[Callable[[dict], None]] = None

    @classmethod
    def get_instance(cls, force_platform: Optional[str] = None) -> "USBMonitorService":
        if cls._instance is None:
            cls._instance = cls(force_platform)
        return cls._instance

    def start(self) -> None:
        """Starts monitoring providers and enumerates already-connected devices."""
        if self._is_active:
            return
        self._is_active = True

        db: Session = SessionLocal()
        try:
            record_audit_event(
                db=db,
                platform=self.platform_name,
                event_type="PLATFORM_PROVIDER_STARTED",
                description=f"Initialized {self.usb_provider.get_provider_name()} on {self.platform_name}."
            )

            # 1. Enumerate and sync already-connected devices (pre-existing connections)
            existing_devs = self.usb_provider.list_devices()
            for dev in existing_devs:
                self._handle_device_connected(dev, db)

            # 2. Enumerate and sync already-mounted removable volumes
            existing_vols = self.volume_provider.list_removable_volumes()
            for vol in existing_vols:
                self._handle_volume_mounted(vol, db)

            # 3. Register live event watchers
            self.usb_provider.watch_events(self._on_device_event)
            self.volume_provider.watch_mount_events(self._on_volume_event)
        finally:
            db.close()

    def _on_device_event(self, event: NormalizedEvent) -> None:
        db: Session = SessionLocal()
        try:
            if event.event_type == "DEVICE_CONNECTED" and event.device:
                self._handle_device_connected(event.device, db)
            elif event.event_type == "DEVICE_REMOVED" and event.device:
                self._handle_device_removed(event.device, db)
        finally:
            db.close()

    def _on_volume_event(self, event: NormalizedEvent) -> None:
        db: Session = SessionLocal()
        try:
            if event.event_type == "VOLUME_MOUNTED" and event.volume:
                self._handle_volume_mounted(event.volume, db)
            elif event.event_type == "VOLUME_UNMOUNTED" and event.volume:
                self._handle_volume_unmounted(event.volume, db)
        finally:
            db.close()

    def _handle_device_connected(self, dev: NormalizedUSBDevice, db: Session) -> USBDevice:
        """Processes USB device connection: registers, checks policy, calculates risk, triggers alerts."""
        db_dev = db.query(USBDevice).filter(USBDevice.device_identifier == dev.device_identifier).first()
        now = datetime.utcnow()

        if not db_dev:
            # First time seeing this device
            db_dev = USBDevice(
                platform=dev.platform,
                device_identifier=dev.device_identifier,
                identity_confidence=dev.identity_confidence,
                device_name=dev.device_name,
                manufacturer=dev.manufacturer,
                vendor_id=dev.vendor_id,
                product_id=dev.product_id,
                serial_number=dev.serial_number,
                device_type=dev.device_type,
                transport=dev.transport,
                status="UNAUTHORIZED", # Default defensive policy
                first_seen=now,
                last_seen=now
            )
            db.add(db_dev)
            db.commit()
            db.refresh(db_dev)

            record_audit_event(
                db=db,
                platform=dev.platform,
                event_type="DEVICE_CONNECTED",
                device_identifier=dev.device_identifier,
                description=f"New USB device detected: {dev.device_name} (VID: {dev.vendor_id}, PID: {dev.product_id})"
            )
        else:
            db_dev.last_seen = now
            db_dev.identity_confidence = dev.identity_confidence

        # Record active connection session
        active_conn = db.query(USBConnection).filter(
            USBConnection.device_id == db_dev.id,
            USBConnection.is_active == True
        ).first()

        if not active_conn:
            active_conn = USBConnection(
                device_id=db_dev.id,
                platform=dev.platform,
                connected_at=now,
                is_active=True
            )
            db.add(active_conn)

        # Run Risk Assessment
        risk = calculate_device_risk(
            device_status=db_dev.status,
            identity_confidence=db_dev.identity_confidence
        )
        db_dev.risk_score = risk.score
        db_dev.risk_level = risk.level
        db.commit()

        # Trigger Defensive Alerts if Unauthorized or Blocked
        if db_dev.status == "BLOCKED":
            create_security_alert(
                db=db,
                device_id=db_dev.id,
                alert_type="BLOCKED_DEVICE",
                severity="CRITICAL",
                risk_score=risk.score,
                title=f"Blocked USB Device Inserted: {db_dev.device_name}",
                description=f"Device {db_dev.device_identifier} is flagged on the security blocklist.",
                reasons=risk.reasons
            )
        elif db_dev.status == "UNAUTHORIZED":
            create_security_alert(
                db=db,
                device_id=db_dev.id,
                alert_type="UNAUTHORIZED_DEVICE",
                severity="HIGH",
                risk_score=risk.score,
                title=f"Unauthorized USB Device Detected: {db_dev.device_name}",
                description="Device was connected without administrator authorization. Remediation required.",
                reasons=risk.reasons
            )

        self._broadcast({"type": "DEVICE_CONNECTED", "device_id": db_dev.id})
        return db_dev

    def _handle_device_removed(self, dev: NormalizedUSBDevice, db: Session) -> None:
        """Processes USB device removal."""
        db_dev = db.query(USBDevice).filter(USBDevice.device_identifier == dev.device_identifier).first()
        if db_dev:
            # Close active connections
            active_conns = db.query(USBConnection).filter(
                USBConnection.device_id == db_dev.id,
                USBConnection.is_active == True
            ).all()
            for c in active_conns:
                c.is_active = False
                c.disconnected_at = datetime.utcnow()

            record_audit_event(
                db=db,
                platform=dev.platform,
                event_type="DEVICE_REMOVED",
                device_identifier=dev.device_identifier,
                description=f"USB device disconnected: {db_dev.device_name}"
            )
            db.commit()
            self._broadcast({"type": "DEVICE_REMOVED", "device_id": db_dev.id})

    def _handle_volume_mounted(self, vol: NormalizedVolume, db: Session) -> USBVolume:
        """Detects mounted removable storage volume and initiates file monitoring."""
        db_vol = db.query(USBVolume).filter(USBVolume.volume_identifier == vol.volume_identifier).first()
        now = datetime.utcnow()

        if not db_vol:
            db_vol = USBVolume(
                volume_identifier=vol.volume_identifier,
                mount_point=vol.mount_point,
                filesystem=vol.filesystem,
                volume_label=vol.volume_label,
                capacity_bytes=vol.capacity_bytes,
                free_bytes=vol.free_bytes,
                read_only=vol.read_only,
                mounted_at=now,
                is_active=True
            )
            db.add(db_vol)
            db.commit()
            db.refresh(db_vol)

            record_audit_event(
                db=db,
                platform=self.platform_name,
                event_type="VOLUME_MOUNTED",
                description=f"Removable storage volume mounted at {vol.mount_point} ({vol.filesystem})"
            )
        else:
            db_vol.is_active = True
            db_vol.unmounted_at = None
            db.commit()

        # Start file monitor on this volume
        if db_vol.id not in self.file_observers:
            obs = VolumeFileObserver(
                volume_id=db_vol.id,
                mount_point=db_vol.mount_point,
                on_event=lambda fe: self._broadcast({"type": "FILE_EVENT", "event_id": fe.id})
            )
            obs.start()
            self.file_observers[db_vol.id] = obs

        self._broadcast({"type": "VOLUME_MOUNTED", "volume_id": db_vol.id})
        return db_vol

    def _handle_volume_unmounted(self, vol: NormalizedVolume, db: Session) -> None:
        """Processes volume unmount and stops file monitor."""
        db_vol = db.query(USBVolume).filter(USBVolume.volume_identifier == vol.volume_identifier).first()
        if db_vol:
            db_vol.is_active = False
            db_vol.unmounted_at = datetime.utcnow()
            db.commit()

            # Stop file observer
            if db_vol.id in self.file_observers:
                self.file_observers[db_vol.id].stop()
                del self.file_observers[db_vol.id]

            record_audit_event(
                db=db,
                platform=self.platform_name,
                event_type="VOLUME_UNMOUNTED",
                description=f"Volume unmounted from {db_vol.mount_point}"
            )
            self._broadcast({"type": "VOLUME_UNMOUNTED", "volume_id": db_vol.id})

    def stop(self) -> None:
        """Graceful shutdown of all monitors."""
        self._is_active = False
        self.usb_provider.stop_watching()
        self.volume_provider.stop_watching()
        for obs in self.file_observers.values():
            obs.stop()
        self.file_observers.clear()

    def _broadcast(self, msg: dict) -> None:
        if self.on_broadcast:
            try:
                self.on_broadcast(msg)
            except Exception:
                pass
