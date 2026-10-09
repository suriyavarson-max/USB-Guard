export type PlatformType = 'windows' | 'linux' | 'macos' | 'unsupported';
export type DeviceStatus = 'AUTHORIZED' | 'UNAUTHORIZED' | 'BLOCKED' | 'UNKNOWN';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IdentityConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
export type IntegrityStatus = 'INTEGRITY_OK' | 'INTEGRITY_CHANGED' | 'UNVERIFIED';

export interface USBDevice {
  id: number;
  platform: string;
  device_identifier: string;
  identity_confidence: IdentityConfidence;
  device_name: string;
  manufacturer: string;
  vendor_id: string;
  product_id: string;
  serial_number: string | null;
  device_type: string;
  transport: string;
  status: DeviceStatus;
  risk_score: number;
  risk_level: RiskLevel;
  first_seen: string;
  last_seen: string;
  created_at: string;
  updated_at: string;
  active_connection: boolean;
  volumes?: USBVolume[];
  alerts?: Alert[];
}

export interface USBVolume {
  id: number;
  device_id: number | null;
  volume_identifier: string;
  mount_point: string;
  filesystem: string;
  volume_label: string;
  capacity_bytes: number;
  free_bytes: number;
  read_only: boolean;
  mounted_at: string;
  unmounted_at: string | null;
  is_active: boolean;
  device_name?: string;
}

export interface FileEvent {
  id: number;
  volume_id: number;
  relative_path: string;
  event_type: 'CREATED' | 'MODIFIED' | 'DELETED' | 'RENAMED';
  size_bytes: number;
  sha256_hash: string | null;
  hash_status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'NOT_AVAILABLE';
  integrity_status: IntegrityStatus;
  timestamp: string;
  is_demo: boolean;
  volume_mount_point?: string;
}

export interface Alert {
  id: number;
  device_id: number | null;
  alert_type: string;
  severity: AlertSeverity;
  risk_score: number;
  title: string;
  description: string;
  reasons_json: string[];
  status: AlertStatus;
  timestamp: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  device_name?: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  platform: string;
  event_type: string;
  actor: string;
  device_identifier: string | null;
  description: string;
  details_json: Record<string, any>;
  previous_hash: string;
  record_hash: string;
}

export interface PlatformCapabilities {
  platform: string;
  usb_native_events: boolean;
  usb_polling_fallback: boolean;
  volume_detection: boolean;
  file_monitoring: boolean;
  hashing: boolean;
  desktop_notifications: boolean;
  supports_device_serial: boolean;
  supports_mount_detection: boolean;
}

export interface PlatformStatus {
  platform: string;
  platform_family: string;
  architecture: string;
  os_release: string;
  provider: string;
  monitoring_mode: string;
  status: string;
  fallback_active: boolean;
  capabilities: PlatformCapabilities;
}

export interface DashboardSummary {
  platform: string;
  platform_family: string;
  provider_name: string;
  monitoring_mode: string;
  provider_status: string;
  total_devices: number;
  connected_devices: number;
  authorized_devices: number;
  unauthorized_devices: number;
  blocked_devices: number;
  mounted_volumes: number;
  total_file_events_today: number;
  total_alerts: number;
  critical_alerts: number;
  average_risk_score: number;
  audit_integrity_status: string;
}

export interface AuditIntegrityResult {
  status: 'VALID' | 'COMPROMISED';
  is_valid: boolean;
  total_records: number;
  verified_records: number;
  tampered_index: number | null;
  latest_hash: string;
  message: string;
}

export interface User {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
}
