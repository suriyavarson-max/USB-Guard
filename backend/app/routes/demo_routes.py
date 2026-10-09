from datetime import datetime
import hashlib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.models import USBDevice, USBConnection, USBVolume, FileEvent, Alert, FileBaseline
from backend.app.schemas.schemas import DemoEventRequest
from backend.app.services.risk_engine import calculate_device_risk
from backend.app.services.alert_service import create_security_alert
from backend.app.services.audit_service import record_audit_event
from backend.app.platforms.common.device_normalizer import normalize_device_id, calculate_identity_confidence

router = APIRouter(prefix="/api/demo", tags=["Simulation & Demo Mode"])

@router.get("/status")
def get_demo_status():
    return {
        "demo_mode_enabled": True,
        "available_platforms": ["windows", "linux", "macos"],
        "supported_simulation_events": [
            "USB_CONNECTED",
            "USB_REMOVED",
            "VOLUME_MOUNTED",
            "VOLUME_UNMOUNTED",
            "UNAUTHORIZED_DEVICE",
            "BLOCKED_DEVICE",
            "FILE_CREATED",
            "FILE_MODIFIED",
            "FILE_DELETED",
            "HASH_CHANGED",
            "HIGH_RISK_ALERT"
        ]
    }

@router.post("/event")
def trigger_demo_event(req: DemoEventRequest, db: Session = Depends(get_db)):
    """
    Safely triggers synthetic simulation events for college classroom demonstrations.
    All records explicitly tagged with is_demo = True.
    """
    demo_plat = req.demo_os.lower()
    evt_type = req.event_type.upper()

    # Mount points per platform
    default_mount = "E:\\" if demo_plat == "windows" else ("/Volumes/SECURE_USB" if demo_plat == "macos" else "/media/demo_user/CYBER_USB")
    mount_point = req.mount_point or default_mount

    dev_name = req.device_name or f"Synthetic {demo_plat.capitalize()} USB Drive"
    vid = req.vendor_id or "0951"
    pid = req.product_id or "1666"
    serial = req.serial_number or f"DEMO-{demo_plat.upper()}-8821"

    norm_id = normalize_device_id(demo_plat, f"demo_bus_{vid}_{pid}", vid, pid, serial)
    conf = calculate_identity_confidence(serial, vid, pid, "demo_hardware_path")

    # 1. Device Connect / Insertion Simulation
    if evt_type in ("USB_CONNECTED", "UNAUTHORIZED_DEVICE", "BLOCKED_DEVICE"):
        dev = db.query(USBDevice).filter(USBDevice.device_identifier == norm_id).first()
        status = "BLOCKED" if evt_type == "BLOCKED_DEVICE" else ("AUTHORIZED" if req.is_authorized else "UNAUTHORIZED")
        
        if not dev:
            dev = USBDevice(
                platform=demo_plat,
                device_identifier=norm_id,
                identity_confidence=conf,
                device_name=dev_name,
                manufacturer="Synthetic Demo Corp",
                vendor_id=vid,
                product_id=pid,
                serial_number=serial,
                device_type="USB_STORAGE",
                status=status,
                first_seen=datetime.utcnow(),
                last_seen=datetime.utcnow()
            )
            db.add(dev)
            db.commit()
            db.refresh(dev)
        else:
            dev.status = status
            dev.last_seen = datetime.utcnow()

        # Add active connection
        conn = USBConnection(
            device_id=dev.id,
            platform=demo_plat,
            connected_at=datetime.utcnow(),
            is_active=True,
            session_metadata={"is_demo": True, "demo_scenario": "College CAT-5 Live Defense"}
        )
        db.add(conn)

        risk = calculate_device_risk(device_status=dev.status, identity_confidence=dev.identity_confidence)
        dev.risk_score = risk.score
        dev.risk_level = risk.level
        db.commit()

        record_audit_event(
            db=db,
            platform=demo_plat,
            event_type="DEVICE_CONNECTED",
            actor="DEMO_SIMULATOR",
            device_identifier=dev.device_identifier,
            description=f"[DEMO SIMULATION] USB device plugged in: {dev.device_name} on {demo_plat.upper()}"
        )

        alert = None
        if dev.status != "AUTHORIZED":
            alert = create_security_alert(
                db=db,
                device_id=dev.id,
                alert_type="BLOCKED_DEVICE" if dev.status == "BLOCKED" else "UNAUTHORIZED_DEVICE",
                severity="CRITICAL" if dev.status == "BLOCKED" else "HIGH",
                risk_score=risk.score,
                title=f"[DEMO] {dev.status} USB Device Inserted",
                description=f"Demonstration alert: {dev.device_name} ({dev.vendor_id}:{dev.product_id}) on {demo_plat.upper()}.",
                reasons=risk.reasons
            )

        return {
            "status": "success",
            "is_demo": True,
            "message": f"Simulated {evt_type} on {demo_plat.upper()}",
            "device_id": dev.id,
            "alert_id": alert.id if alert else None
        }

    # 2. USB Removal Simulation
    elif evt_type == "USB_REMOVED":
        dev = db.query(USBDevice).filter(USBDevice.device_identifier == norm_id).first()
        if dev:
            active_conns = db.query(USBConnection).filter(
                USBConnection.device_id == dev.id,
                USBConnection.is_active == True
            ).all()
            for c in active_conns:
                c.is_active = False
                c.disconnected_at = datetime.utcnow()
            
            record_audit_event(
                db=db,
                platform=demo_plat,
                event_type="DEVICE_REMOVED",
                actor="DEMO_SIMULATOR",
                device_identifier=dev.device_identifier,
                description=f"[DEMO SIMULATION] USB device removed: {dev.device_name}"
            )
            db.commit()
            return {"status": "success", "is_demo": True, "message": f"Simulated removal of {dev.device_name}"}
        return {"status": "warning", "is_demo": True, "message": "No active device matching criteria"}

    # 3. Storage Volume Mount Simulation
    elif evt_type == "VOLUME_MOUNTED":
        vol_id = f"demo_vol_{demo_plat}_{abs(hash(mount_point)) % 100000}"
        vol = db.query(USBVolume).filter(USBVolume.volume_identifier == vol_id).first()
        dev = db.query(USBDevice).filter(USBDevice.platform == demo_plat).order_by(USBDevice.id.desc()).first()
        
        if not vol:
            vol = USBVolume(
                device_id=dev.id if dev else None,
                volume_identifier=vol_id,
                mount_point=mount_point,
                filesystem="exFAT" if demo_plat != "linux" else "ext4",
                volume_label="DEMO_PORTABLE",
                capacity_bytes=32_000_000_000, # 32 GB
                free_bytes=24_500_000_000,
                read_only=False,
                mounted_at=datetime.utcnow(),
                is_active=True
            )
            db.add(vol)
        else:
            vol.is_active = True
            vol.unmounted_at = None

        record_audit_event(
            db=db,
            platform=demo_plat,
            event_type="VOLUME_MOUNTED",
            actor="DEMO_SIMULATOR",
            description=f"[DEMO SIMULATION] Storage volume mounted at {mount_point}"
        )
        db.commit()
        db.refresh(vol)
        return {"status": "success", "is_demo": True, "volume_id": vol.id, "mount_point": vol.mount_point}

    # 4. File Events (Created, Modified, Deleted, Hash Changed)
    elif evt_type in ("FILE_CREATED", "FILE_MODIFIED", "FILE_DELETED", "HASH_CHANGED", "HIGH_RISK_ALERT"):
        vol = db.query(USBVolume).filter(USBVolume.is_active == True).order_by(USBVolume.id.desc()).first()
        if not vol:
            vol = USBVolume(
                volume_identifier=f"demo_vol_{demo_plat}_primary",
                mount_point=mount_point,
                filesystem="FAT32",
                volume_label="DEMO_STORAGE",
                capacity_bytes=16_000_000_000,
                free_bytes=10_000_000_000,
                mounted_at=datetime.utcnow(),
                is_active=True
            )
            db.add(vol)
            db.commit()
            db.refresh(vol)

        rel_path = req.relative_path or "Research/malicious_payload_or_doc.exe"
        
        # Calculate synthetic hashes
        initial_hash = hashlib.sha256(b"Baseline authentic contents 2026").hexdigest()
        tampered_hash = hashlib.sha256(b"Tampered payload content inserted").hexdigest()

        if evt_type == "FILE_CREATED":
            event_type = "CREATED"
            sha = initial_hash
            integrity = "INTEGRITY_OK"
            baseline = FileBaseline(
                volume_id=vol.id,
                relative_path=rel_path,
                size_bytes=45200,
                sha256_hash=initial_hash,
                first_seen=datetime.utcnow(),
                last_verified=datetime.utcnow()
            )
            db.add(baseline)
        elif evt_type in ("HASH_CHANGED", "HIGH_RISK_ALERT"):
            event_type = "MODIFIED"
            sha = tampered_hash
            integrity = "INTEGRITY_CHANGED"
        elif evt_type == "FILE_MODIFIED":
            event_type = "MODIFIED"
            sha = initial_hash
            integrity = "INTEGRITY_OK"
        else:
            event_type = "DELETED"
            sha = None
            integrity = "UNVERIFIED"

        f_evt = FileEvent(
            volume_id=vol.id,
            relative_path=rel_path,
            event_type=event_type,
            size_bytes=58400,
            sha256_hash=sha,
            hash_status="SUCCESS" if sha else "NOT_AVAILABLE",
            integrity_status=integrity,
            timestamp=datetime.utcnow(),
            is_demo=True
        )
        db.add(f_evt)

        audit_desc = f"[DEMO SIMULATION] File {event_type}: {rel_path} on volume {vol.mount_point}"
        if integrity == "INTEGRITY_CHANGED":
            audit_desc += " [POTENTIAL INTEGRITY CHANGE DETECTED]"

        record_audit_event(
            db=db,
            platform=demo_plat,
            event_type=f"FILE_{event_type}",
            actor="DEMO_SIMULATOR",
            description=audit_desc,
            details={"sha256": sha, "integrity_status": integrity, "is_demo": True}
        )

        alert = None
        if integrity == "INTEGRITY_CHANGED" or evt_type == "HIGH_RISK_ALERT":
            alert = create_security_alert(
                db=db,
                alert_type="HASH_CHANGED",
                severity="CRITICAL",
                risk_score=85,
                title=f"[DEMO] File Integrity Change: {rel_path}",
                description="SHA-256 hash checksum mismatch detected against recorded baseline. Potential tampering or unverified overwrite.",
                reasons=[
                    "Unexpected file integrity change detected",
                    "SHA-256 checksum mismatch against stored baseline",
                    "Modification occurred on removable media without change authorization"
                ]
            )

        db.commit()
        return {
            "status": "success",
            "is_demo": True,
            "event_type": event_type,
            "relative_path": rel_path,
            "sha256": sha,
            "integrity_status": integrity,
            "alert_created": alert is not None
        }

    return {"status": "error", "message": f"Unknown simulation event '{evt_type}'"}
