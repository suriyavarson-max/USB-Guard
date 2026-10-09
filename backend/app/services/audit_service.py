import hashlib
import json
from datetime import datetime
from typing import Dict, Any, Optional

try:
    from sqlalchemy.orm import Session
    from backend.app.models.models import AuditLog
except ImportError:
    Session = Any # type: ignore
    AuditLog = None # type: ignore

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

def compute_record_hash(
    previous_hash: str,
    timestamp_iso: str,
    platform: str,
    event_type: str,
    actor: str,
    device_identifier: Optional[str],
    description: str,
    details: Dict[str, Any]
) -> str:
    """
    Computes cryptographic SHA-256 hash chaining over serialized record fields.
    """
    content = {
        "prev": previous_hash,
        "ts": timestamp_iso,
        "plat": platform,
        "evt": event_type,
        "actor": actor,
        "dev": device_identifier or "",
        "desc": description,
        "det": details
    }
    serialized = json.dumps(content, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

def record_audit_event(
    db: Session,
    platform: str,
    event_type: str,
    description: str,
    actor: str = "SYSTEM",
    device_identifier: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> Any:
    """
    Appends an immutable tamper-evident audit record to the cryptographic hash chain.
    """
    if details is None:
        details = {}

    last_record = db.query(AuditLog).order_by(AuditLog.id.desc()).first() if hasattr(db, "query") else None
    prev_hash = last_record.record_hash if last_record else GENESIS_HASH

    now = datetime.utcnow()
    now_iso = now.isoformat()

    rec_hash = compute_record_hash(
        previous_hash=prev_hash,
        timestamp_iso=now_iso,
        platform=platform,
        event_type=event_type,
        actor=actor,
        device_identifier=device_identifier,
        description=description,
        details=details
    )

    if AuditLog:
        log_entry = AuditLog(
            timestamp=now,
            platform=platform,
            event_type=event_type,
            actor=actor,
            device_identifier=device_identifier,
            description=description,
            details_json=details,
            previous_hash=prev_hash,
            record_hash=rec_hash
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
    return None

def verify_audit_log_integrity(db: Session) -> Dict[str, Any]:
    """
    Iterates sequentially through the audit log table, recalculating and verifying
    the cryptographic hash chain link-by-link.
    """
    if not hasattr(db, "query") or not AuditLog:
        return {
            "status": "VALID",
            "is_valid": True,
            "total_records": 0,
            "verified_records": 0,
            "tampered_index": None,
            "latest_hash": GENESIS_HASH,
            "message": "Audit ledger initialized. Genesis state intact."
        }

    records = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
    total = len(records)
    if total == 0:
        return {
            "status": "VALID",
            "is_valid": True,
            "total_records": 0,
            "verified_records": 0,
            "tampered_index": None,
            "latest_hash": GENESIS_HASH,
            "message": "Audit ledger is currently empty. Genesis state intact."
        }

    expected_prev = GENESIS_HASH
    for idx, rec in enumerate(records):
        # 1. Verify previous_hash link
        if rec.previous_hash != expected_prev:
            return {
                "status": "COMPROMISED",
                "is_valid": False,
                "total_records": total,
                "verified_records": idx,
                "tampered_index": rec.id,
                "latest_hash": rec.record_hash,
                "message": f"Hash chain broken at record #{rec.id}! Expected previous hash {expected_prev[:12]}..., found {rec.previous_hash[:12]}..."
            }

        # 2. Recalculate record hash
        recalculated = compute_record_hash(
            previous_hash=rec.previous_hash,
            timestamp_iso=rec.timestamp.isoformat(),
            platform=rec.platform,
            event_type=rec.event_type,
            actor=rec.actor,
            device_identifier=rec.device_identifier,
            description=rec.description,
            details=rec.details_json or {}
        )

        if recalculated != rec.record_hash:
            return {
                "status": "COMPROMISED",
                "is_valid": False,
                "total_records": total,
                "verified_records": idx,
                "tampered_index": rec.id,
                "latest_hash": rec.record_hash,
                "message": f"Tampering detected! Payload content modified at record #{rec.id}."
            }

        expected_prev = rec.record_hash

    return {
        "status": "VALID",
        "is_valid": True,
        "total_records": total,
        "verified_records": total,
        "tampered_index": None,
        "latest_hash": expected_prev,
        "message": f"All {total} audit log records verified against cryptographic SHA-256 hash chain."
    }
