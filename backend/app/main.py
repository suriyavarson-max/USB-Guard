import logging
import platform
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.services.usb_monitor import USBMonitorService
from backend.app.routes import (
    platform_routes,
    auth_routes,
    device_routes,
    volume_routes,
    file_routes,
    alert_routes,
    audit_routes,
    report_routes,
    demo_routes,
)
from backend.app.routes import dashboard_routes

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("usb_security.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Sequence
    logger.info("==================================================================")
    logger.info("USB Device Security Monitoring and Threat Detection System")
    logger.info("College CAT Level 5 Defensive Cybersecurity Platform")
    logger.info("==================================================================")
    logger.info(f"Detected Operating System: {platform.system()} ({platform.release()})")
    logger.info(f"Architecture: {platform.machine()}")
    
    # 1. Initialize Database Schema safely
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized.")

    # 2. Start Common USB and Volume Monitoring Orchestrator
    monitor_service = USBMonitorService.get_instance()
    monitor_service.start()
    logger.info(f"Active Monitoring Provider: {monitor_service.usb_provider.get_provider_name()}")
    
    yield

    # Shutdown Sequence
    logger.info("Shutting down USB security monitors...")
    monitor_service.stop()
    logger.info("Clean shutdown complete.")

app = FastAPI(
    title=settings.APP_NAME,
    description="Cross-platform defensive USB security monitoring, device authorization, and incident detection.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permissive for local dev / demonstration
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health endpoint
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "HEALTHY",
        "system": platform.system(),
        "database": "CONNECTED",
        "monitoring": "ACTIVE"
    }

# Register API Routers
app.include_router(platform_routes.router)
app.include_router(auth_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(device_routes.router)
app.include_router(volume_routes.router)
app.include_router(file_routes.router)
app.include_router(alert_routes.router)
app.include_router(audit_routes.router)
app.include_router(report_routes.router)
app.include_router(demo_routes.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=settings.APP_PORT, reload=True)
