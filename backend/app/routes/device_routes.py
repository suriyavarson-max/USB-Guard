from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.database import get_db
from backend.app.models.models import USBDevice, USBConnection, USBVolume, Alert
from backend.app.schemas.schemas import USBDeviceOut
from backend.app.services.risk_engine import calculate_device_risk
from backend.app.services.audit_service import record_audit_event
from backend.app.services.alert_service import create_security_alert

router = APIRouter(prefix="/api", tags=["USB Devices"])

@router.get("/devices", response_model=List[USBDeviceOut])
def list_devices(
    status: Optional[str] = Query(None, description="Filter by status: AUTHORIZED, UNAUTHORIZED, BLOCKED, UNKNOWN"),
    search: Optional[str] = Query(None, description="Search by name, VID, PID, serial, identifier"),
    platform: Optional[str] = Query(None, description="Filter by platform: windows, linux, macos"),
    db: Session = Depends(get_db)
):
    query = db.query(USBDevice)
    if status:
        query = query.filter(USBDevice.status == status.upper())
    if platform:
        query = query.filter(USBDevice.platform == platform.lower())
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                USBDevice.device_name.ilike(search_filter),
                USBDevice.device_identifier.ilike(search_filter),
                USBDevice.vendor_id.ilike(search_filter),
                USBDevice.product_id.ilike(search_filter),
                USBDevice.serial_number.ilike(search_filter),
                USBDevice.manufacturer.ilike(search_filter),
            )
        )
    devices = query.order_by(USBDevice.last_seen.desc()).all()
    
    # Enrich with active connection flag
    results = []
    for d in devices:
        active_conn = db.query(USBConnection).filter(
            USBConnection.device_id == d.id,
            USBConnection.is_active == True
        ).first()
        out = USBDeviceOut.from_orm(d)
        out.active_connection = active_conn is not None
        results.append(out)
    return results

@router.get("/devices/{device_id}", response_model=USBDeviceOut)
def get_device(device_id: int, db: Session = Depends(get_db)):
    dev = db.query(USBDevice).filter(USBDevice.id == device_id).first()
    if not dev:
        raise HTTPException(status_code=404, detail="The requested USB device was not found.")
    active_conn = db.query(USBConnection).filter(
        USBConnection.device_id == dev.id,
        USBConnection.is_active == True
    ).first()
    out = USBDeviceOut.from_orm(dev)
    out.active_connection = active_conn is not None
    return out

@router.post("/devices/{device_id}/authorize", response_model=USBDeviceOut)
def authorize_device(device_id: int, db: Session = Depends(get_db)):
    dev = db.query(USBDevice).filter(USBDevice.id == device_id).first()
    if not dev:
        raise HTTPException(status_code=404, detail="The requested USB device was not found.")
    
    dev.status = "AUTHORIZED"
    risk = calculate_device_risk(device_status=dev.status, identity_confidence=dev.identity_confidence)
    dev.risk_score = risk.score
    dev.risk_level = risk.level
    db.commit()

    record_audit_event(
        db=db,
        platform=dev.platform,
        event_type="DEVICE_AUTHORIZED",
        device_identifier=dev.device_identifier,
        description=f"Device '{dev.device_name}' granted AUTHORIZED status by administrator"
    )
    return dev

@router.post("/devices/{device_id}/block", response_model=USBDeviceOut)
def block_device(device_id: int, db: Session = Depends(get_db)):
    dev = db.query(USBDevice).filter(USBDevice.id == device_id).first()
    if not dev:
        raise HTTPException(status_code=404, detail="The requested USB device was not found.")
    
    dev.status = "BLOCKED"
    risk = calculate_device_risk(device_status=dev.status, identity_confidence=dev.identity_confidence)
    dev.risk_score = risk.score
    dev.risk_level = risk.level
    db.commit()

    record_audit_event(
        db=db,
        platform=dev.platform,
        event_type="DEVICE_BLOCKED",
        device_identifier=dev.device_identifier,
        description=f"Device '{dev.device_name}' moved to BLOCKED security restriction list"
    )

    create_security_alert(
        db=db,
        device_id=dev.id,
        alert_type="BLOCKED_DEVICE",
        severity="CRITICAL",
        risk_score=risk.score,
        title=f"Device Placed on Blocklist: {dev.device_name}",
        description=f"Administrative block rule applied to hardware ID {dev.device_identifier}.",
        reasons=risk.reasons
    )
    return dev

@router.post("/devices/{device_id}/unblock", response_model=USBDeviceOut)
def unblock_device(device_id: int, db: Session = Depends(get_db)):
    dev = db.query(USBDevice).filter(USBDevice.id == device_id).first()
    if not dev:
        raise HTTPException(status_code=404, detail="The requested USB device was not found.")
    
    dev.status = "UNAUTHORIZED" # Reverts to baseline unauthorized
    risk = calculate_device_risk(device_status=dev.status, identity_confidence=dev.identity_confidence)
    dev.risk_score = risk.score
    dev.risk_level = risk.level
    db.commit()

    record_audit_event(
        db=db,
        platform=dev.platform,
        event_type="DEVICE_UNBLOCKED",
        device_identifier=dev.device_identifier,
        description=f"Device '{dev.device_name}' unblocked and reset to policy evaluation state"
    )
    return dev

@router.get("/connections")
def list_connections(db: Session = Depends(get_db)):
    conns = db.query(USBConnection).order_by(USBConnection.connected_at.desc()).limit(100).all()
    results = []
    for c in conns:
        dev = db.query(USBDevice).filter(USBDevice.id == c.device_id).first()
        results.append({
            "id": c.id,
            "device_id": c.device_id,
            "device_name": dev.device_name if dev else "Unknown Device",
            "device_identifier": dev.device_identifier if dev else "N/A",
            "platform": c.platform,
            "connected_at": c.connected_at,
            "disconnected_at": c.disconnected_at,
            "is_active": c.is_active
        })
    return results
