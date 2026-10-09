from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    role = Column(String(32), default="admin", nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

class USBDevice(Base):
    __tablename__ = "usb_devices"

    id = Column(Integer, primary_key=True, index=True)
    platform = Column(String(32), index=True, nullable=False) # windows, linux, macos
    device_identifier = Column(String(256), unique=True, index=True, nullable=False)
    identity_confidence = Column(String(16), default="MEDIUM", nullable=False) # HIGH, MEDIUM, LOW
    device_name = Column(String(256), nullable=False)
    manufacturer = Column(String(256), default="Unknown")
    vendor_id = Column(String(32), default="0000")
    product_id = Column(String(32), default="0000")
    serial_number = Column(String(256), nullable=True)
    device_type = Column(String(64), default="USB_STORAGE") # USB_STORAGE, HID, HUB, etc.
    transport = Column(String(32), default="USB")
    status = Column(String(32), default="UNAUTHORIZED", index=True) # AUTHORIZED, UNAUTHORIZED, BLOCKED, UNKNOWN
    risk_score = Column(Integer, default=40)
    risk_level = Column(String(16), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    connections = relationship("USBConnection", back_populates="device", cascade="all, delete-orphan")
    volumes = relationship("USBVolume", back_populates="device", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="device", cascade="all, delete-orphan")

class USBConnection(Base):
    __tablename__ = "usb_connections"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("usb_devices.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(32), nullable=False)
    connected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    disconnected_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    session_metadata = Column(JSON, default=dict)

    device = relationship("USBDevice", back_populates="connections")

class USBVolume(Base):
    __tablename__ = "usb_volumes"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("usb_devices.id", ondelete="SET NULL"), nullable=True)
    volume_identifier = Column(String(256), unique=True, index=True, nullable=False)
    mount_point = Column(String(512), nullable=False)
    filesystem = Column(String(64), default="FAT32")
    volume_label = Column(String(128), default="Removable")
    capacity_bytes = Column(Integer, default=0)
    free_bytes = Column(Integer, default=0)
    read_only = Column(Boolean, default=False)
    mounted_at = Column(DateTime, default=datetime.utcnow)
    unmounted_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    device = relationship("USBDevice", back_populates="volumes")
    file_events = relationship("FileEvent", back_populates="volume", cascade="all, delete-orphan")
    baselines = relationship("FileBaseline", back_populates="volume", cascade="all, delete-orphan")

class FileEvent(Base):
    __tablename__ = "file_events"

    id = Column(Integer, primary_key=True, index=True)
    volume_id = Column(Integer, ForeignKey("usb_volumes.id", ondelete="CASCADE"), nullable=False)
    relative_path = Column(String(1024), nullable=False)
    event_type = Column(String(32), nullable=False) # CREATED, MODIFIED, DELETED, RENAMED
    size_bytes = Column(Integer, default=0)
    sha256_hash = Column(String(64), nullable=True)
    hash_status = Column(String(32), default="SUCCESS") # SUCCESS, FAILED, SKIPPED, NOT_AVAILABLE
    integrity_status = Column(String(32), default="UNVERIFIED") # INTEGRITY_OK, INTEGRITY_CHANGED, UNVERIFIED
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    is_demo = Column(Boolean, default=False)

    volume = relationship("USBVolume", back_populates="file_events")

class FileBaseline(Base):
    __tablename__ = "file_baselines"

    id = Column(Integer, primary_key=True, index=True)
    volume_id = Column(Integer, ForeignKey("usb_volumes.id", ondelete="CASCADE"), nullable=False)
    relative_path = Column(String(1024), nullable=False)
    size_bytes = Column(Integer, default=0)
    sha256_hash = Column(String(64), nullable=False)
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_verified = Column(DateTime, default=datetime.utcnow)

    volume = relationship("USBVolume", back_populates="baselines")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("usb_devices.id", ondelete="SET NULL"), nullable=True)
    alert_type = Column(String(64), nullable=False) # UNAUTHORIZED_DEVICE, BLOCKED_DEVICE, SUSPICIOUS_FILE_ACTIVITY, etc.
    severity = Column(String(16), default="MEDIUM", index=True) # INFO, LOW, MEDIUM, HIGH, CRITICAL
    risk_score = Column(Integer, default=50)
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=False)
    reasons_json = Column(JSON, default=list)
    status = Column(String(32), default="NEW", index=True) # NEW, ACKNOWLEDGED, RESOLVED
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    device = relationship("USBDevice", back_populates="alerts")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    platform = Column(String(32), nullable=False)
    event_type = Column(String(64), nullable=False, index=True)
    actor = Column(String(64), default="SYSTEM")
    device_identifier = Column(String(256), nullable=True)
    description = Column(Text, nullable=False)
    details_json = Column(JSON, default=dict)
    previous_hash = Column(String(64), nullable=False) # Tamper-evident hash chain
    record_hash = Column(String(64), nullable=False)

class PlatformEvent(Base):
    __tablename__ = "platform_events"

    id = Column(Integer, primary_key=True, index=True)
    platform = Column(String(32), nullable=False)
    provider = Column(String(64), nullable=False)
    event_type = Column(String(64), nullable=False)
    raw_event_type = Column(String(128), nullable=True)
    normalized_event_type = Column(String(64), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
