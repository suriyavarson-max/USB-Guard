import tempfile
from pathlib import Path
from backend.app.services.hash_service import calculate_sha256, verify_file_hash

def test_calculate_sha256_known_string():
    with tempfile.NamedTemporaryFile(mode="w+", delete=False) as tf:
        tf.write("Hello USB Security 2026")
        temp_path = Path(tf.name)

    try:
        res = calculate_sha256(temp_path)
        assert res.status == "SUCCESS"
        assert res.sha256 is not None
        assert len(res.sha256) == 64
        # Verify deterministic match
        is_match, _ = verify_file_hash(temp_path, res.sha256)
        assert is_match is True
    finally:
        temp_path.unlink()

def test_calculate_sha256_missing_file():
    missing_path = Path("/tmp/non_existent_usb_file_9999.xyz")
    res = calculate_sha256(missing_path)
    assert res.status == "NOT_AVAILABLE"
    assert res.sha256 is None

def test_calculate_sha256_size_limit():
    with tempfile.NamedTemporaryFile(mode="wb+", delete=False) as tf:
        tf.write(b"0" * 1024)
        temp_path = Path(tf.name)

    try:
        # Max limit 500 bytes -> should skip
        res = calculate_sha256(temp_path, max_size_bytes=500)
        assert res.status == "SKIPPED"
        assert res.sha256 is None
    finally:
        temp_path.unlink()
