import os
import hmac
import hashlib
import base64
import json
import time
from typing import Optional, Dict
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.app.config import settings

security_bearer = HTTPBearer(auto_error=False)

def hash_password(password: str, salt: Optional[bytes] = None) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with random salt."""
    if salt is None:
        salt = os.urandom(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    salt_b64 = base64.b64encode(salt).decode("ascii")
    hash_b64 = base64.b64encode(hashed).decode("ascii")
    return f"{salt_b64}${hash_b64}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Safely verify a password against a stored PBKDF2 hash using constant-time comparison."""
    try:
        salt_b64, hash_b64 = stored_hash.split("$", 1)
        salt = base64.b64decode(salt_b64.encode("ascii"))
        expected_hash = base64.b64decode(hash_b64.encode("ascii"))
        candidate_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
        return hmac.compare_digest(expected_hash, candidate_hash)
    except Exception:
        return False

def create_access_token(user_id: int, username: str, role: str, expires_in_seconds: int = 86400) -> str:
    """Create a tamper-evident signed token without external C-extensions."""
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": int(time.time()) + expires_in_seconds,
        "iat": int(time.time()),
    }
    payload_json = json.dumps(payload, separators=(",", ":"))
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode("utf-8")).decode("ascii").rstrip("=")
    
    signature = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        payload_b64.encode("ascii"),
        hashlib.sha256
    ).hexdigest()
    
    return f"{payload_b64}.{signature}"

def verify_token(token: str) -> Optional[Dict]:
    """Verify cryptographic token signature and expiration."""
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, signature = parts
        
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            payload_b64.encode("ascii"),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(expected_sig, signature):
            return None
        
        # Add padding back if necessary
        padding = "=" * ((4 - len(payload_b64) % 4) % 4)
        raw_json = base64.urlsafe_b64decode((payload_b64 + padding).encode("ascii")).decode("utf-8")
        payload = json.loads(raw_json)
        
        if payload.get("exp", 0) < int(time.time()):
            return None # Expired
        
        return payload
    except Exception:
        return None

# Simple in-memory rate limiter for login protection
_login_attempts: Dict[str, list] = {}

def check_login_rate_limit(client_ip: str, max_attempts: int = 5, window_seconds: int = 60) -> bool:
    """Prevents brute-force attacks on local administrator authentication."""
    now = time.time()
    attempts = _login_attempts.get(client_ip, [])
    # Filter attempts within window
    attempts = [t for t in attempts if now - t < window_seconds]
    if len(attempts) >= max_attempts:
        _login_attempts[client_ip] = attempts
        return False
    attempts.append(now)
    _login_attempts[client_ip] = attempts
    return True

def get_current_user_token(credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)) -> Dict:
    """Dependency for securing admin endpoints."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided."
        )
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token."
        )
    return payload
