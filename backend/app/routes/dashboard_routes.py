import platform
from datetime import datetime, date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database import get_db
from backend.app.models.models import USBDevice, USBConnection, USBVolume, FileEvent, Alert, AuditLog
from backend.app.schemas.schemas import DashboardSummaryResponse
from backend.app.platforms.factory import get_platform_adapter
from backend.app.platforms.capabilities import detect_platform_capabilities
from backend.app.services.audit_service import verify_audit_log_integrity

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    usb_p, vol_p, plat_name = get_platform_adapter()
    caps = detect_platform_capabilities()
    mode = "NATIVE EVENTS" if caps.usb_native_events else "POLLING FALLBACK"

    total_devices = db.query(USBDevice).count()
    connected_devices = db.query(USBConnection).filter(USBConnection.is_active == True).count()
    auth_devices = db.query(USBDevice).filter(USBDevice.status == "AUTHORIZED").count()
    unauth_devices = db.query(USBDevice).filter(USBDevice.status == "UNAUTHORIZED").count()
    blocked_devices = db.query(USBDevice).filter(USBDevice.status == "BLOCKED").count()
    
    mounted_vols = db.query(USBVolume).filter(USBVolume.is_active == True).count()
    
    # File events today
    today_start = datetime.combine(date.today(), datetime.min.time())
    file_events_today = db.query(FileEvent).filter(FileEvent.timestamp >= today_start).count()

    total_alerts = db.query(Alert).count()
    critical_alerts = db.query(Alert).filter(Alert.severity == "CRITICAL").count()

    all_devs = db.query(USBDevice).all()
    avg_risk = int(sum(d.risk_score for d in all_devs) / len(all_devs)) if all_devs else 0

    integrity = verify_audit_log_integrity(db)

    sys_name = platform.system()
    plat_family = sys_name.lower()
    if plat_family == "darwin":
        plat_family = "macos"

    return DashboardSummaryResponse(
        platform="macOS" if plat_family == "macos" else sys_name,
        platform_family=plat_family,
        provider_name=usb_p.get_provider_name(),
        monitoring_mode=mode,
        provider_status="ACTIVE",
        total_devices=total_devices,
        connected_devices=connected_devices,
        authorized_devices=auth_devices,
        unauthorized_devices=unauth_devices,
        blocked_devices=blocked_devices,
        mounted_volumes=mounted_vols,
        total_file_events_today=file_events_today,
        total_alerts=total_alerts,
        critical_alerts=critical_alerts,
        average_risk_score=avg_risk,
        audit_integrity_status=integrity["status"]
    )
