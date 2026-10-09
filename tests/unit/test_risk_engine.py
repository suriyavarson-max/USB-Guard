from backend.app.services.risk_engine import calculate_device_risk

def test_authorized_clean_device_risk():
    risk = calculate_device_risk(device_status="AUTHORIZED", identity_confidence="HIGH")
    assert risk.score == 0
    assert risk.level == "LOW"

def test_unauthorized_device_risk():
    risk = calculate_device_risk(device_status="UNAUTHORIZED", identity_confidence="MEDIUM")
    assert risk.score >= 50
    assert risk.level in ("HIGH", "CRITICAL")
    assert any("not enrolled" in r.lower() for r in risk.reasons)

def test_blocked_device_critical_risk():
    risk = calculate_device_risk(device_status="BLOCKED", identity_confidence="HIGH")
    assert risk.score >= 70
    assert any("blocklist" in r.lower() for r in risk.reasons)

def test_composite_risk_tampering():
    risk = calculate_device_risk(
        device_status="UNAUTHORIZED",
        identity_confidence="LOW",
        file_mods_count=15,
        file_deletions_count=8,
        hash_change_detected=True
    )
    assert risk.score >= 80
    assert risk.level == "CRITICAL"
    assert len(risk.reasons) >= 4
