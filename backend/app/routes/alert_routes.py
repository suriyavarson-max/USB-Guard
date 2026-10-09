from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.models import Alert, USBDevice
from backend.app.schemas.schemas import AlertOut, AlertUpdate
from backend.app.services.alert_service import acknowledge_alert, resolve_alert
from backend.app.services.audit_service import record_audit_event

router = APIRouter(prefix="/api/alerts", tags=["Security Alerts"])

@router.get("", response_model=List[AlertOut])
def list_alerts(
    severity: Optional[str] = Query(None, description="INFO, LOW, MEDIUM, HIGH, CRITICAL"),
    status: Optional[str] = Query(None, description="NEW, ACKNOWLEDGED, RESOLVED"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if severity:
        query = query.filter(Alert.severity == severity.upper())
    if status:
        query = query.filter(Alert.status == status.upper())
    
    alerts = query.order_by(Alert.timestamp.desc()).limit(limit).all()
    results = []
    for a in alerts:
        dev_name = None
        if a.device_id:
            dev = db.query(USBDevice).filter(USBDevice.id == a.device_id).first()
            if dev:
                dev_name = dev.device_name
        out = AlertOut.from_orm(a)
        out.device_name = dev_name
        results.append(out)
    return results

@router.get("/{alert_id}", response_model=AlertOut)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found.")
    dev_name = None
    if a.device_id:
        dev = db.query(USBDevice).filter(USBDevice.id == a.device_id).first()
        if dev:
            dev_name = dev.device_name
    out = AlertOut.from_orm(a)
    out.device_name = dev_name
    return out

@router.patch("/{alert_id}", response_model=AlertOut)
def update_alert(alert_id: int, update: AlertUpdate, db: Session = Depends(get_db)):
    req_status = update.status.upper()
    if req_status == "ACKNOWLEDGED":
        alert = acknowledge_alert(db, alert_id)
        if alert:
            record_audit_event(
                db=db,
                platform="system",
                event_type="ALERT_ACKNOWLEDGED",
                description=f"Security alert #{alert.id} ({alert.title}) acknowledged"
            )
    elif req_status == "RESOLVED":
        alert = resolve_alert(db, alert_id)
        if alert:
            record_audit_event(
                db=db,
                platform="system",
                event_type="ALERT_RESOLVED",
                description=f"Security alert #{alert.id} ({alert.title}) marked as resolved"
            )
    else:
        raise HTTPException(status_code=400, detail="Status must be ACKNOWLEDGED or RESOLVED")
        
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
        
    dev_name = None
    if alert.device_id:
        dev = db.query(USBDevice).filter(USBDevice.id == alert.device_id).first()
        if dev:
            dev_name = dev.device_name
    out = AlertOut.from_orm(alert)
    out.device_name = dev_name
    return out
