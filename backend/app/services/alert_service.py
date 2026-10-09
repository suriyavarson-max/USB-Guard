from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.models import Alert, USBDevice

def create_security_alert(
    db: Session,
    alert_type: str,
    severity: str,
    title: str,
    description: str,
    device_id: Optional[int] = None,
    risk_score: int = 50,
    reasons: Optional[List[str]] = None
) -> Alert:
    """
    Creates and records a prioritized defensive security incident alert.
    """
    if reasons is None:
        reasons = []

    alert = Alert(
        device_id=device_id,
        alert_type=alert_type,
        severity=severity.upper(),
        risk_score=risk_score,
        title=title,
        description=description,
        reasons_json=reasons,
        status="NEW",
        timestamp=datetime.utcnow(),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

def acknowledge_alert(db: Session, alert_id: int) -> Optional[Alert]:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert:
        alert.status = "ACKNOWLEDGED"
        alert.acknowledged_at = datetime.utcnow()
        db.commit()
        db.refresh(alert)
    return alert

def resolve_alert(db: Session, alert_id: int) -> Optional[Alert]:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert:
        alert.status = "RESOLVED"
        alert.resolved_at = datetime.utcnow()
        db.commit()
        db.refresh(alert)
    return alert
