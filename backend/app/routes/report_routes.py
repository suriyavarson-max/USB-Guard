import io
import csv
import platform
from datetime import datetime
from fastapi import APIRouter, Depends, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.models import USBDevice, USBVolume, FileEvent, Alert, AuditLog, USBConnection
from backend.app.platforms.factory import get_platform_adapter
from backend.app.platforms.capabilities import detect_platform_capabilities
from backend.app.services.audit_service import verify_audit_log_integrity, record_audit_event

router = APIRouter(prefix="/api/reports", tags=["Security Reports"])

@router.get("/security")
def get_security_report_data(db: Session = Depends(get_db)):
    usb_p, vol_p, plat_name = get_platform_adapter()
    caps = detect_platform_capabilities()
    mode = "Native Events" if caps.usb_native_events else "Polling Fallback"

    total_devices = db.query(USBDevice).count()
    auth_devices = db.query(USBDevice).filter(USBDevice.status == "AUTHORIZED").count()
    unauth_devices = db.query(USBDevice).filter(USBDevice.status == "UNAUTHORIZED").count()
    blocked_devices = db.query(USBDevice).filter(USBDevice.status == "BLOCKED").count()
    mounted_vols = db.query(USBVolume).filter(USBVolume.is_active == True).count()
    total_conns = db.query(USBConnection).count()
    total_file_events = db.query(FileEvent).count()
    total_alerts = db.query(Alert).count()
    critical_alerts = db.query(Alert).filter(Alert.severity == "CRITICAL").count()

    all_devices = db.query(USBDevice).all()
    avg_risk = int(sum(d.risk_score for d in all_devices) / len(all_devices)) if all_devices else 0

    integrity = verify_audit_log_integrity(db)

    record_audit_event(
        db=db,
        platform=plat_name,
        event_type="REPORT_GENERATED",
        description="Executive cybersecurity posture report generated"
    )

    return {
        "title": "USB Device Security & Incident Threat Report",
        "generated_at": datetime.utcnow().isoformat(),
        "host_operating_system": platform.system(),
        "architecture": platform.machine(),
        "monitoring_provider": usb_p.get_provider_name(),
        "monitoring_mode": mode,
        "statistics": {
            "total_usb_devices": total_devices,
            "authorized_devices": auth_devices,
            "unauthorized_devices": unauth_devices,
            "blocked_devices": blocked_devices,
            "mounted_storage_volumes": mounted_vols,
            "total_connection_sessions": total_conns,
            "total_file_events": total_file_events,
            "total_alerts": total_alerts,
            "critical_alerts": critical_alerts,
            "average_risk_score": avg_risk
        },
        "audit_integrity": {
            "status": integrity["status"],
            "total_verified": integrity["verified_records"],
            "latest_hash": integrity.get("latest_hash", "N/A")
        }
    }

@router.get("/security.csv")
def export_security_csv(db: Session = Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["USB Device Security Monitoring - Comprehensive Audit Export"])
    writer.writerow(["Generated At", datetime.utcnow().isoformat()])
    writer.writerow(["Host OS", platform.system()])
    writer.writerow([])
    
    writer.writerow(["--- DEVICES ---"])
    writer.writerow(["ID", "Platform", "Device Name", "VID", "PID", "Serial", "Confidence", "Status", "Risk Score"])
    devices = db.query(USBDevice).all()
    for d in devices:
        writer.writerow([d.id, d.platform, d.device_name, d.vendor_id, d.product_id, d.serial_number or "N/A", d.identity_confidence, d.status, d.risk_score])
    writer.writerow([])

    writer.writerow(["--- ALERTS ---"])
    writer.writerow(["ID", "Device ID", "Type", "Severity", "Risk Score", "Title", "Status", "Timestamp"])
    alerts = db.query(Alert).all()
    for a in alerts:
        writer.writerow([a.id, a.device_id or "N/A", a.alert_type, a.severity, a.risk_score, a.title, a.status, a.timestamp.isoformat()])
    writer.writerow([])

    writer.writerow(["--- FILE EVENTS ---"])
    writer.writerow(["ID", "Volume ID", "Relative Path", "Event Type", "Size Bytes", "SHA256", "Integrity", "Timestamp"])
    file_events = db.query(FileEvent).all()
    for f in file_events:
        writer.writerow([f.id, f.volume_id, f.relative_path, f.event_type, f.size_bytes, f.sha256_hash or "N/A", f.integrity_status, f.timestamp.isoformat()])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=usb_security_audit_report.csv"}
    )
