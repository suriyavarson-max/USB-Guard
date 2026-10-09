import platform
from fastapi import APIRouter, Depends
from backend.app.platforms.capabilities import detect_platform_capabilities, PlatformCapabilities
from backend.app.platforms.factory import get_platform_adapter
from backend.app.schemas.schemas import PlatformStatusResponse

router = APIRouter(prefix="/api/platform", tags=["Platform"])

@router.get("", summary="Get host platform info")
def get_platform_info():
    sys_name = platform.system()
    plat_family = sys_name.lower()
    if plat_family == "darwin":
        plat_family = "macos"
    
    usb_p, vol_p, plat_name = get_platform_adapter()
    caps = detect_platform_capabilities()
    mode = "native" if caps.usb_native_events else "polling fallback"

    return {
        "platform": "macOS" if plat_family == "macos" else sys_name,
        "platform_family": plat_family,
        "architecture": platform.machine(),
        "provider": usb_p.get_provider_name(),
        "monitoring_mode": mode
    }

@router.get("/capabilities", summary="Get platform capabilities")
def get_capabilities():
    return detect_platform_capabilities()

@router.get("/status", summary="Get monitoring provider health & status")
def get_platform_status():
    sys_name = platform.system()
    plat_family = sys_name.lower()
    if plat_family == "darwin":
        plat_family = "macos"
        
    usb_p, vol_p, plat_name = get_platform_adapter()
    caps = detect_platform_capabilities()
    mode = "native" if caps.usb_native_events else "polling fallback"

    return {
        "platform": "macOS" if plat_family == "macos" else sys_name,
        "platform_family": plat_family,
        "architecture": platform.machine(),
        "os_release": platform.release(),
        "provider": usb_p.get_provider_name(),
        "monitoring_mode": mode,
        "status": "HEALTHY",
        "fallback_active": not caps.usb_native_events,
        "capabilities": caps
    }
