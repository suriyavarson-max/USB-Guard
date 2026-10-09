import hashlib
from pathlib import Path
from typing import Optional, Tuple
from dataclasses import dataclass

try:
    from pydantic import BaseModel
    class HashResult(BaseModel):
        sha256: Optional[str] = None
        status: str = "SUCCESS" # SUCCESS, FAILED, SKIPPED, NOT_AVAILABLE
        size_bytes: int = 0
        error_message: Optional[str] = None
except ImportError:
    @dataclass
    class HashResult:
        sha256: Optional[str] = None
        status: str = "SUCCESS"
        size_bytes: int = 0
        error_message: Optional[str] = None

def calculate_sha256(file_path: Path, max_size_bytes: Optional[int] = None) -> HashResult:
    """
    Computes SHA-256 hash in 64KB streaming chunks.
    Gracefully handles locked files, permission errors, missing files, and large files.
    """
    if max_size_bytes is None:
        max_size_bytes = 52428800 # 50 MB default

    try:
        path_obj = file_path if isinstance(file_path, Path) else Path(file_path)
        if not path_obj.exists() or not path_obj.is_file():
            return HashResult(sha256=None, status="NOT_AVAILABLE", size_bytes=0, error_message="File does not exist or is not a regular file")

        file_size = path_obj.stat().st_size
        if file_size > max_size_bytes:
            return HashResult(
                sha256=None,
                status="SKIPPED",
                size_bytes=file_size,
                error_message=f"File size ({file_size} bytes) exceeds automatic analysis limit ({max_size_bytes} bytes)"
            )

        hasher = hashlib.sha256()
        chunk_size = 65536 # 64KB
        with path_obj.open("rb") as f:
            while chunk := f.read(chunk_size):
                hasher.update(chunk)
                
        return HashResult(
            sha256=hasher.hexdigest(),
            status="SUCCESS",
            size_bytes=file_size
        )
    except PermissionError:
        return HashResult(sha256=None, status="FAILED", error_message="Permission denied while attempting to hash file")
    except FileNotFoundError:
        return HashResult(sha256=None, status="NOT_AVAILABLE", error_message="File disappeared during hashing operation")
    except Exception as e:
        return HashResult(sha256=None, status="FAILED", error_message=str(e))

def verify_file_hash(file_path: Path, expected_hash: str) -> Tuple[bool, HashResult]:
    """
    Verifies if a file matches an expected SHA-256 cryptographic hash.
    Returns (is_match, hash_result).
    """
    result = calculate_sha256(file_path)
    if result.status != "SUCCESS" or not result.sha256:
        return False, result
    is_match = result.sha256.lower() == expected_hash.lower()
    return is_match, result
