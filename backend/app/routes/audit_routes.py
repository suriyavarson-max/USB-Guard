from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.models import AuditLog
from backend.app.schemas.schemas import AuditLogOut, AuditIntegrityResponse
from backend.app.services.audit_service import verify_audit_log_integrity

router = APIRouter(prefix="/api/audit-logs", tags=["Audit Ledger"])

@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    platform: Optional[str] = Query(None, description="Filter by platform"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if event_type:
        query = query.filter(AuditLog.event_type == event_type.upper())
    if platform:
        query = query.filter(AuditLog.platform == platform.lower())
    
    logs = query.order_by(AuditLog.id.desc()).limit(limit).all()
    return logs

@router.get("/integrity", response_model=AuditIntegrityResponse)
def get_audit_integrity(db: Session = Depends(get_db)):
    """
    Cryptographic verification endpoint.
    Recalculates SHA-256 hash chaining across all audit records and flags any tampering.
    """
    res = verify_audit_log_integrity(db)
    return AuditIntegrityResponse(**res)
