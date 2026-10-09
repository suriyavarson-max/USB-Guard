from typing import List
from dataclasses import dataclass, field

try:
    from pydantic import BaseModel
    class RiskAssessment(BaseModel):
        score: int
        level: str # LOW, MEDIUM, HIGH, CRITICAL
        reasons: List[str]
except ImportError:
    @dataclass
    class RiskAssessment:
        score: int
        level: str
        reasons: List[str] = field(default_factory=list)

def calculate_device_risk(
    device_status: str, # AUTHORIZED, UNAUTHORIZED, BLOCKED, UNKNOWN
    identity_confidence: str = "MEDIUM", # HIGH, MEDIUM, LOW
    previous_alert_count: int = 0,
    file_mods_count: int = 0,
    file_deletions_count: int = 0,
    hash_change_detected: bool = False,
    repeated_suspicious_activity: bool = False
) -> RiskAssessment:
    """
    Operating-system-independent defensive heuristic risk engine.
    Computes a transparent normalized risk score from 0 to 100 with clear explainable reasons.
    """
    score = 0
    reasons: List[str] = []

    # Device Status Factors
    normalized_status = device_status.upper()
    if normalized_status == "BLOCKED":
        score += 70
        reasons.append("Device is explicitly placed on the system blocklist")
    elif normalized_status == "UNAUTHORIZED":
        score += 50
        reasons.append("Device is not enrolled or authorized in policy registry")
    elif normalized_status == "UNKNOWN":
        score += 40
        reasons.append("Unrecognized hardware identifier and unverified vendor signature")

    # Low Identity Confidence Risk
    if identity_confidence == "LOW":
        score += 15
        reasons.append("Device lacks stable serial or vendor verification (Identity confidence LOW)")

    # Historical Security Alerts
    if previous_alert_count > 0:
        score += min(25, 15 + (previous_alert_count * 2))
        reasons.append(f"Device associated with {previous_alert_count} prior security alert(s)")

    # Behavioral File Activity
    if file_mods_count > 10:
        score += 15
        reasons.append(f"High-frequency file modifications observed ({file_mods_count} modifications)")

    if file_deletions_count > 5:
        score += 20
        reasons.append(f"High-volume file deletions observed ({file_deletions_count} deletions)")

    if hash_change_detected:
        score += 20
        reasons.append("Unexpected file-integrity checksum discrepancy detected against baseline")

    if repeated_suspicious_activity:
        score += 10
        reasons.append("Repeated anomalous activity across active volume sessions")

    # Clamp to [0, 100]
    score = max(0, min(100, score))

    # Normalize category levels
    if score >= 75:
        level = "CRITICAL"
    elif score >= 50:
        level = "HIGH"
    elif score >= 25:
        level = "MEDIUM"
    else:
        level = "LOW"

    if not reasons:
        reasons.append("Hardware credentials verified; no suspicious activity detected")

    return RiskAssessment(score=score, level=level, reasons=reasons)
