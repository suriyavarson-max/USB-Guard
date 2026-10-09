import os
import sys
from pathlib import Path
from typing import List
from pydantic import BaseModel

def get_app_data_dir() -> Path:
    """Returns platform-appropriate user data directory without hardcoded user paths."""
    home = Path.home()
    if sys.platform.startswith("win"):
        base = Path(os.getenv("LOCALAPPDATA", home / "AppData" / "Local"))
    elif sys.platform.startswith("darwin"):
        base = home / "Library" / "Application Support"
    else:
        base = Path(os.getenv("XDG_DATA_HOME", home / ".local" / "share"))
    
    app_dir = base / "USBSecurityMonitor"
    try:
        app_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        # Fallback to local execution directory if permissions are constrained
        app_dir = Path("./data")
        app_dir.mkdir(parents=True, exist_ok=True)
    return app_dir

class Settings(BaseModel):
    APP_NAME: str = "USB Device Security Monitoring and Threat Detection System"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    APP_PORT: int = int(os.getenv("APP_PORT", "8000"))
    SECRET_KEY: str = os.getenv("SECRET_KEY", "college_cat5_usb_security_monitoring_secret_key_change_in_prod")
    DATABASE_PATH: Path = get_app_data_dir() / "usb_security.db"
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{get_app_data_dir() / 'usb_security.db'}")
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    USB_POLL_INTERVAL: int = int(os.getenv("USB_POLL_INTERVAL", "2"))
    FILE_EVENT_DEBOUNCE_MS: int = int(os.getenv("FILE_EVENT_DEBOUNCE_MS", "500"))
    MAX_HASH_FILE_SIZE_BYTES: int = int(os.getenv("MAX_HASH_FILE_SIZE_BYTES", "52428800")) # 50 MB
    ENABLE_DEMO_MODE: bool = os.getenv("ENABLE_DEMO_MODE", "true").lower() == "true"
    REPORTS_DIR: Path = get_app_data_dir() / "reports"

settings = Settings()
settings.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
