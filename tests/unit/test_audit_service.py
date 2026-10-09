import sqlite3
from datetime import datetime
from backend.app.services.audit_service import compute_record_hash, GENESIS_HASH

def test_audit_hash_chain_calculation():
    ts1 = datetime.utcnow().isoformat()
    hash1 = compute_record_hash(
        previous_hash=GENESIS_HASH,
        timestamp_iso=ts1,
        platform="linux",
        event_type="DEVICE_CONNECTED",
        actor="SYSTEM",
        device_identifier="linux:0951:1666:SER1",
        description="USB Storage plugged in",
        details={"speed": "480Mbps"}
    )
    assert len(hash1) == 64

    # Second block in chain linked to hash1
    ts2 = datetime.utcnow().isoformat()
    hash2 = compute_record_hash(
        previous_hash=hash1,
        timestamp_iso=ts2,
        platform="linux",
        event_type="VOLUME_MOUNTED",
        actor="SYSTEM",
        device_identifier="linux:0951:1666:SER1",
        description="Volume mounted at /media/user/USB",
        details={"fs": "FAT32"}
    )
    assert len(hash2) == 64
    assert hash1 != hash2

def test_audit_hash_chain_tampering_detection():
    ts = datetime.utcnow().isoformat()
    original_hash = compute_record_hash(
        previous_hash=GENESIS_HASH,
        timestamp_iso=ts,
        platform="windows",
        event_type="DEVICE_AUTHORIZED",
        actor="admin",
        device_identifier="windows:0951:1666:SER1",
        description="Authorized by policy",
        details={}
    )

    # If payload is tampered:
    tampered_hash = compute_record_hash(
        previous_hash=GENESIS_HASH,
        timestamp_iso=ts,
        platform="windows",
        event_type="DEVICE_AUTHORIZED",
        actor="admin",
        device_identifier="windows:0951:1666:SER1",
        description="TAMPERED by attacker", # altered description
        details={}
    )
    assert original_hash != tampered_hash
