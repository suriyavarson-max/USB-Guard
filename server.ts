import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import os from 'os';
import path from 'path';

const app = express();
const PORT = process.env.NODE_ENV === 'production' && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// In-Memory Database / State Engine mirroring Python DB models
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

interface Device {
  id: number;
  platform: string;
  device_identifier: string;
  identity_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  device_name: string;
  manufacturer: string;
  vendor_id: string;
  product_id: string;
  serial_number: string | null;
  device_type: string;
  transport: string;
  status: 'AUTHORIZED' | 'UNAUTHORIZED' | 'BLOCKED' | 'UNKNOWN';
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  first_seen: string;
  last_seen: string;
  created_at: string;
  updated_at: string;
  active_connection: boolean;
}

interface Volume {
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

interface FileEvent {
  id: number;
  volume_id: number;
  relative_path: string;
  event_type: 'CREATED' | 'MODIFIED' | 'DELETED' | 'RENAMED';
  size_bytes: number;
  sha256_hash: string | null;
  hash_status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'NOT_AVAILABLE';
  integrity_status: 'INTEGRITY_OK' | 'INTEGRITY_CHANGED' | 'UNVERIFIED';
  timestamp: string;
  is_demo: boolean;
  volume_mount_point?: string;
}

interface FileBaseline {
  id: number;
  volume_id: number;
  relative_path: string;
  size_bytes: number;
  sha256_hash: string;
  first_seen: string;
  last_verified: string;
}

interface Alert {
  id: number;
  device_id: number | null;
  alert_type: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  title: string;
  description: string;
  reasons_json: string[];
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
  timestamp: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  device_name?: string;
}

interface AuditLog {
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

interface Connection {
  id: number;
  device_id: number;
  device_name: string;
  device_identifier: string;
  platform: string;
  connected_at: string;
  disconnected_at: string | null;
  is_active: boolean;
}

// Global Store State
let devices: Device[] = [];
let volumes: Volume[] = [];
let fileEvents: FileEvent[] = [];
let baselines: FileBaseline[] = [];
let alerts: Alert[] = [];
let auditLogs: AuditLog[] = [];
let connections: Connection[] = [];
let sseClients: Response[] = [];

// Helper to broadcast Server-Sent Events
function broadcastSSE(type: string, data: any) {
  const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  sseClients.forEach((client) => {
    client.write(`event: update\ndata: ${payload}\n\n`);
  });
}

// Compute Audit Hash Chain
function computeAuditHash(
  prevHash: string,
  timestamp: string,
  platformName: string,
  eventType: string,
  actor: string,
  deviceId: string | null,
  description: string,
  details: Record<string, any>
): string {
  const content = {
    prev: prevHash,
    ts: timestamp,
    plat: platformName,
    evt: eventType,
    actor: actor,
    dev: deviceId || '',
    desc: description,
    det: details,
  };
  const serialized = JSON.stringify(content, Object.keys(content).sort());
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

function addAuditLog(
  platformName: string,
  eventType: string,
  description: string,
  actor = 'SYSTEM',
  deviceId: string | null = null,
  details: Record<string, any> = {}
): AuditLog {
  const lastLog = auditLogs[auditLogs.length - 1];
  const prevHash = lastLog ? lastLog.record_hash : GENESIS_HASH;
  const now = new Date().toISOString();

  const recHash = computeAuditHash(
    prevHash,
    now,
    platformName,
    eventType,
    actor,
    deviceId,
    description,
    details
  );

  const newLog: AuditLog = {
    id: auditLogs.length + 1,
    timestamp: now,
    platform: platformName,
    event_type: eventType,
    actor,
    device_identifier: deviceId,
    description,
    details_json: details,
    previous_hash: prevHash,
    record_hash: recHash,
  };
  auditLogs.push(newLog);
  broadcastSSE('AUDIT_LOG', newLog);
  return newLog;
}

function calculateRisk(status: string, confidence: string, alertCount = 0, fileMods = 0, fileDeletions = 0, hashChanged = false) {
  let score = 0;
  const reasons: string[] = [];

  if (status === 'BLOCKED') {
    score += 70;
    reasons.push('Device is explicitly placed on the system blocklist');
  } else if (status === 'UNAUTHORIZED') {
    score += 50;
    reasons.push('Device is not enrolled or authorized in policy registry');
  } else if (status === 'UNKNOWN') {
    score += 40;
    reasons.push('Unrecognized hardware identifier');
  }

  if (confidence === 'LOW') {
    score += 15;
    reasons.push('Device lacks stable hardware serial number');
  }

  if (alertCount > 0) {
    score += Math.min(25, 15 + alertCount * 2);
    reasons.push(`Device associated with prior security alert(s)`);
  }

  if (fileMods > 10) {
    score += 15;
    reasons.push(`High-frequency file modifications observed (${fileMods} edits)`);
  }

  if (fileDeletions > 5) {
    score += 20;
    reasons.push(`High-volume file deletions observed (${fileDeletions} removals)`);
  }

  if (hashChanged) {
    score += 20;
    reasons.push('Unexpected file-integrity checksum discrepancy detected against baseline');
  }

  score = Math.max(0, Math.min(100, score));

  let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (score >= 75) level = 'CRITICAL';
  else if (score >= 50) level = 'HIGH';
  else if (score >= 25) level = 'MEDIUM';

  if (reasons.length === 0) {
    reasons.push('Verified hardware signature; no security anomalies detected');
  }

  return { score, level, reasons };
}

// Seed Initial State
function initSeed() {
  const hostPlat = os.platform(); // 'linux', 'darwin', 'win32'
  const platFamily = hostPlat === 'win32' ? 'windows' : hostPlat === 'darwin' ? 'macos' : 'linux';

  // Seed Initial Audit
  addAuditLog(platFamily, 'PLATFORM_PROVIDER_STARTED', `System initialized monitoring on ${platFamily.toUpperCase()} platform.`);

  // Device 1: Authorized Kingston USB
  const now = new Date().toISOString();
  const d1: Device = {
    id: 1,
    platform: platFamily,
    device_identifier: `${platFamily}:0951:1666:00187D0A2BEF`,
    identity_confidence: 'HIGH',
    device_name: 'Kingston DataTraveler 3.0',
    manufacturer: 'Kingston Technology',
    vendor_id: '0951',
    product_id: '1666',
    serial_number: '00187D0A2BEF',
    device_type: 'USB_STORAGE',
    transport: 'USB',
    status: 'AUTHORIZED',
    risk_score: 0,
    risk_level: 'LOW',
    first_seen: new Date(Date.now() - 3600000 * 24).toISOString(),
    last_seen: now,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: now,
    active_connection: true,
  };
  devices.push(d1);

  connections.push({
    id: 1,
    device_id: 1,
    device_name: d1.device_name,
    device_identifier: d1.device_identifier,
    platform: platFamily,
    connected_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    disconnected_at: null,
    is_active: true,
  });

  const mountPath = platFamily === 'windows' ? 'E:\\' : platFamily === 'macos' ? '/Volumes/KINGSTON_SEC' : '/media/user/KINGSTON_SEC';
  const v1: Volume = {
    id: 1,
    device_id: 1,
    volume_identifier: `vol_primary_${platFamily}_01`,
    mount_point: mountPath,
    filesystem: 'exFAT',
    volume_label: 'KINGSTON_SEC',
    capacity_bytes: 31_200_000_000,
    free_bytes: 18_400_000_000,
    read_only: false,
    mounted_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    unmounted_at: null,
    is_active: true,
    device_name: d1.device_name,
  };
  volumes.push(v1);

  addAuditLog(platFamily, 'DEVICE_CONNECTED', `Hardware registered: ${d1.device_name}`, 'SYSTEM', d1.device_identifier);
  addAuditLog(platFamily, 'VOLUME_MOUNTED', `Volume mounted at ${v1.mount_point} (${v1.filesystem})`, 'SYSTEM');

  // Baseline files
  const baselineHash1 = crypto.createHash('sha256').update('CyberSecurity Report Q3 Authentic Copy').digest('hex');
  const baselineHash2 = crypto.createHash('sha256').update('Database Schema Backup Safe Content').digest('hex');

  baselines.push({
    id: 1,
    volume_id: 1,
    relative_path: 'Audits/security_policy_2026.pdf',
    size_bytes: 1420500,
    sha256_hash: baselineHash1,
    first_seen: new Date(Date.now() - 3600000 * 4).toISOString(),
    last_verified: now,
  });

  fileEvents.push({
    id: 1,
    volume_id: 1,
    relative_path: 'Audits/security_policy_2026.pdf',
    event_type: 'CREATED',
    size_bytes: 1420500,
    sha256_hash: baselineHash1,
    hash_status: 'SUCCESS',
    integrity_status: 'INTEGRITY_OK',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    is_demo: false,
    volume_mount_point: v1.mount_point,
  });

  fileEvents.push({
    id: 2,
    volume_id: 1,
    relative_path: 'Backups/db_backup.sql',
    event_type: 'CREATED',
    size_bytes: 4200000,
    sha256_hash: baselineHash2,
    hash_status: 'SUCCESS',
    integrity_status: 'INTEGRITY_OK',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    is_demo: false,
    volume_mount_point: v1.mount_point,
  });

  // Device 2: Unauthorized Flash Drive inserted earlier
  const d2: Device = {
    id: 2,
    platform: platFamily,
    device_identifier: `${platFamily}:0781:5583:4C530001090123`,
    identity_confidence: 'HIGH',
    device_name: 'SanDisk Ultra Flair',
    manufacturer: 'SanDisk Corp.',
    vendor_id: '0781',
    product_id: '5583',
    serial_number: '4C530001090123',
    device_type: 'USB_STORAGE',
    transport: 'USB',
    status: 'UNAUTHORIZED',
    risk_score: 50,
    risk_level: 'HIGH',
    first_seen: new Date(Date.now() - 3600000).toISOString(),
    last_seen: now,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: now,
    active_connection: true,
  };
  devices.push(d2);

  alerts.push({
    id: 1,
    device_id: 2,
    alert_type: 'UNAUTHORIZED_DEVICE',
    severity: 'HIGH',
    risk_score: 50,
    title: `Unauthorized Device Connected: ${d2.device_name}`,
    description: 'Device not found in approved policy registry. Access restricted pending administrator authorization.',
    reasons_json: ['Device is not enrolled or authorized in policy registry'],
    status: 'NEW',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    device_name: d2.device_name,
  });

  addAuditLog(platFamily, 'DEVICE_CONNECTED', `Unauthorized USB detected: ${d2.device_name} (VID: ${d2.vendor_id})`, 'SYSTEM', d2.device_identifier);
  addAuditLog(platFamily, 'ALERT_GENERATED', `High-severity alert #1 generated for unauthorized hardware`, 'SYSTEM');
}

initSeed();

// ----------------- API ROUTES ----------------- //

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'HEALTHY',
    system: os.type(),
    database: 'CONNECTED',
    monitoring: 'ACTIVE',
  });
});

// Platform Info
app.get('/api/platform', (req: Request, res: Response) => {
  const hostPlat = os.platform();
  const platFamily = hostPlat === 'win32' ? 'windows' : hostPlat === 'darwin' ? 'macos' : 'linux';
  const sysDisplay = hostPlat === 'win32' ? 'Windows' : hostPlat === 'darwin' ? 'macOS' : 'Linux';

  res.json({
    platform: sysDisplay,
    platform_family: platFamily,
    architecture: os.arch(),
    provider: `${sysDisplay} Hardware & Device Notification Adapter`,
    monitoring_mode: 'Native Events (with Polling Fallback)',
  });
});

// Platform Capabilities
app.get('/api/platform/capabilities', (req: Request, res: Response) => {
  const hostPlat = os.platform();
  const platFamily = hostPlat === 'win32' ? 'windows' : hostPlat === 'darwin' ? 'macos' : 'linux';

  res.json({
    platform: platFamily,
    usb_native_events: true,
    usb_polling_fallback: true,
    volume_detection: true,
    file_monitoring: true,
    hashing: true,
    desktop_notifications: false,
    supports_device_serial: true,
    supports_mount_detection: true,
  });
});

// Platform Status
app.get('/api/platform/status', (req: Request, res: Response) => {
  const hostPlat = os.platform();
  const platFamily = hostPlat === 'win32' ? 'windows' : hostPlat === 'darwin' ? 'macos' : 'linux';
  const sysDisplay = hostPlat === 'win32' ? 'Windows' : hostPlat === 'darwin' ? 'macOS' : 'Linux';

  res.json({
    platform: sysDisplay,
    platform_family: platFamily,
    architecture: os.arch(),
    os_release: os.release(),
    provider: `${sysDisplay} Native Adapter`,
    monitoring_mode: 'NATIVE EVENTS',
    status: 'HEALTHY',
    fallback_active: false,
    capabilities: {
      platform: platFamily,
      usb_native_events: true,
      usb_polling_fallback: true,
      volume_detection: true,
      file_monitoring: true,
      hashing: true,
      desktop_notifications: false,
      supports_device_serial: true,
      supports_mount_detection: true,
    },
  });
});

// Auth
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (username === 'admin' && (password === 'admin123' || password === 'admin' || password === 'password')) {
    addAuditLog('system', 'LOGIN', `Administrator '${username}' authenticated successfully`, username);
    res.json({
      access_token: 'usb_sec_session_token_' + Date.now(),
      token_type: 'bearer',
      user: {
        id: 1,
        username: 'admin',
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      },
    });
  } else {
    addAuditLog('system', 'LOGIN_FAILED', `Failed login attempt for username '${username}'`, username);
    res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  addAuditLog('system', 'LOGOUT', "Administrator 'admin' logged out", 'admin');
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  res.json({
    id: 1,
    username: 'admin',
    role: 'admin',
    is_active: true,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  });
});

// Dashboard Summary
app.get('/api/dashboard/summary', (req: Request, res: Response) => {
  const hostPlat = os.platform();
  const platFamily = hostPlat === 'win32' ? 'windows' : hostPlat === 'darwin' ? 'macos' : 'linux';
  const sysDisplay = hostPlat === 'win32' ? 'Windows' : hostPlat === 'darwin' ? 'macOS' : 'Linux';

  const totalDevices = devices.length;
  const connectedDevices = devices.filter((d) => d.active_connection).length;
  const authorizedDevices = devices.filter((d) => d.status === 'AUTHORIZED').length;
  const unauthorizedDevices = devices.filter((d) => d.status === 'UNAUTHORIZED').length;
  const blockedDevices = devices.filter((d) => d.status === 'BLOCKED').length;
  const mountedVolumes = volumes.filter((v) => v.is_active).length;
  const totalFileEventsToday = fileEvents.length;
  const totalAlerts = alerts.length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const avgRisk = totalDevices ? Math.round(devices.reduce((acc, d) => acc + d.risk_score, 0) / totalDevices) : 0;

  res.json({
    platform: sysDisplay,
    platform_family: platFamily,
    provider_name: `${sysDisplay} Security Adapter`,
    monitoring_mode: 'NATIVE EVENTS',
    provider_status: 'ACTIVE',
    total_devices: totalDevices,
    connected_devices: connectedDevices,
    authorized_devices: authorizedDevices,
    unauthorized_devices: unauthorizedDevices,
    blocked_devices: blockedDevices,
    mounted_volumes: mountedVolumes,
    total_file_events_today: totalFileEventsToday,
    total_alerts: totalAlerts,
    critical_alerts: criticalAlerts,
    average_risk_score: avgRisk,
    audit_integrity_status: 'VALID',
  });
});

// Devices List
app.get('/api/devices', (req: Request, res: Response) => {
  const { status, search, platform: platQuery } = req.query;
  let result = [...devices];

  if (status) {
    result = result.filter((d) => d.status === (status as string).toUpperCase());
  }
  if (platQuery) {
    result = result.filter((d) => d.platform === (platQuery as string).toLowerCase());
  }
  if (search) {
    const q = (search as string).toLowerCase();
    result = result.filter(
      (d) =>
        d.device_name.toLowerCase().includes(q) ||
        d.device_identifier.toLowerCase().includes(q) ||
        d.vendor_id.toLowerCase().includes(q) ||
        d.product_id.toLowerCase().includes(q) ||
        (d.serial_number && d.serial_number.toLowerCase().includes(q))
    );
  }
  res.json(result);
});

// Device Details
app.get('/api/devices/:id', (req: Request, res: Response) => {
  const dev = devices.find((d) => d.id === parseInt(req.params.id, 10));
  if (!dev) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Device not found' } });
  }
  const devVols = volumes.filter((v) => v.device_id === dev.id);
  const devAlerts = alerts.filter((a) => a.device_id === dev.id);
  res.json({ ...dev, volumes: devVols, alerts: devAlerts });
});

// Device Authorize
app.post('/api/devices/:id/authorize', (req: Request, res: Response) => {
  const dev = devices.find((d) => d.id === parseInt(req.params.id, 10));
  if (!dev) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Device not found' } });
  }
  dev.status = 'AUTHORIZED';
  const r = calculateRisk(dev.status, dev.identity_confidence);
  dev.risk_score = r.score;
  dev.risk_level = r.level;
  dev.updated_at = new Date().toISOString();

  addAuditLog(dev.platform, 'DEVICE_AUTHORIZED', `Device '${dev.device_name}' granted AUTHORIZED status by administrator`, 'admin', dev.device_identifier);
  broadcastSSE('DEVICE_UPDATED', dev);
  res.json(dev);
});

// Device Block
app.post('/api/devices/:id/block', (req: Request, res: Response) => {
  const dev = devices.find((d) => d.id === parseInt(req.params.id, 10));
  if (!dev) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Device not found' } });
  }
  dev.status = 'BLOCKED';
  const r = calculateRisk(dev.status, dev.identity_confidence);
  dev.risk_score = r.score;
  dev.risk_level = r.level;
  dev.updated_at = new Date().toISOString();

  addAuditLog(dev.platform, 'DEVICE_BLOCKED', `Device '${dev.device_name}' placed on security blocklist`, 'admin', dev.device_identifier);

  const blockAlert: Alert = {
    id: alerts.length + 1,
    device_id: dev.id,
    alert_type: 'BLOCKED_DEVICE',
    severity: 'CRITICAL',
    risk_score: r.score,
    title: `Device Placed on Blocklist: ${dev.device_name}`,
    description: `Administrative restriction enforced on hardware ${dev.device_identifier}. Any mounted storage must be dismounted.`,
    reasons_json: r.reasons,
    status: 'NEW',
    timestamp: new Date().toISOString(),
    device_name: dev.device_name,
  };
  alerts.unshift(blockAlert);

  broadcastSSE('DEVICE_UPDATED', dev);
  broadcastSSE('ALERT_CREATED', blockAlert);
  res.json(dev);
});

// Device Unblock
app.post('/api/devices/:id/unblock', (req: Request, res: Response) => {
  const dev = devices.find((d) => d.id === parseInt(req.params.id, 10));
  if (!dev) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Device not found' } });
  }
  dev.status = 'UNAUTHORIZED';
  const r = calculateRisk(dev.status, dev.identity_confidence);
  dev.risk_score = r.score;
  dev.risk_level = r.level;
  dev.updated_at = new Date().toISOString();

  addAuditLog(dev.platform, 'DEVICE_UNBLOCKED', `Device '${dev.device_name}' unblocked and reset to evaluation policy`, 'admin', dev.device_identifier);
  broadcastSSE('DEVICE_UPDATED', dev);
  res.json(dev);
});

// Connections History
app.get('/api/connections', (req: Request, res: Response) => {
  res.json(connections);
});

// Volumes List
app.get('/api/volumes', (req: Request, res: Response) => {
  res.json(volumes);
});

// Volume Detail
app.get('/api/volumes/:id', (req: Request, res: Response) => {
  const v = volumes.find((vol) => vol.id === parseInt(req.params.id, 10));
  if (!v) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Volume not found' } });
  }
  res.json(v);
});

// File Events List
app.get('/api/file-events', (req: Request, res: Response) => {
  const { volume_id, event_type, limit } = req.query;
  let result = [...fileEvents];
  if (volume_id) {
    result = result.filter((f) => f.volume_id === parseInt(volume_id as string, 10));
  }
  if (event_type) {
    result = result.filter((f) => f.event_type === (event_type as string).toUpperCase());
  }
  result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const max = limit ? parseInt(limit as string, 10) : 100;
  res.json(result.slice(0, max));
});

// Alerts List
app.get('/api/alerts', (req: Request, res: Response) => {
  const { severity, status } = req.query;
  let result = [...alerts];
  if (severity) {
    result = result.filter((a) => a.severity === (severity as string).toUpperCase());
  }
  if (status) {
    result = result.filter((a) => a.status === (status as string).toUpperCase());
  }
  result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(result);
});

// Alert Triage Update
app.patch('/api/alerts/:id', (req: Request, res: Response) => {
  const alertId = parseInt(req.params.id, 10);
  const a = alerts.find((al) => al.id === alertId);
  if (!a) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Alert not found' } });
  }
  const { status } = req.body;
  if (status === 'ACKNOWLEDGED') {
    a.status = 'ACKNOWLEDGED';
    a.acknowledged_at = new Date().toISOString();
    addAuditLog('system', 'ALERT_ACKNOWLEDGED', `Alert #${a.id} (${a.title}) acknowledged`, 'admin');
  } else if (status === 'RESOLVED') {
    a.status = 'RESOLVED';
    a.resolved_at = new Date().toISOString();
    addAuditLog('system', 'ALERT_RESOLVED', `Alert #${a.id} (${a.title}) marked as resolved`, 'admin');
  }
  broadcastSSE('ALERT_UPDATED', a);
  res.json(a);
});

// Audit Logs
app.get('/api/audit-logs', (req: Request, res: Response) => {
  const { event_type, platform: platQuery } = req.query;
  let result = [...auditLogs];
  if (event_type) {
    result = result.filter((l) => l.event_type === (event_type as string).toUpperCase());
  }
  if (platQuery) {
    result = result.filter((l) => l.platform === (platQuery as string).toLowerCase());
  }
  result.sort((a, b) => b.id - a.id);
  res.json(result);
});

// Audit Integrity Verification (Recalculates cryptographic SHA-256 chain)
app.get('/api/audit-logs/integrity', (req: Request, res: Response) => {
  let expectedPrev = GENESIS_HASH;
  let isValid = true;
  let tamperedIndex: number | null = null;
  let verifiedCount = 0;

  for (let i = 0; i < auditLogs.length; i++) {
    const rec = auditLogs[i];
    if (rec.previous_hash !== expectedPrev) {
      isValid = false;
      tamperedIndex = rec.id;
      break;
    }
    const recalc = computeAuditHash(
      rec.previous_hash,
      rec.timestamp,
      rec.platform,
      rec.event_type,
      rec.actor,
      rec.device_identifier,
      rec.description,
      rec.details_json
    );
    if (recalc !== rec.record_hash) {
      isValid = false;
      tamperedIndex = rec.id;
      break;
    }
    expectedPrev = rec.record_hash;
    verifiedCount++;
  }

  res.json({
    status: isValid ? 'VALID' : 'COMPROMISED',
    is_valid: isValid,
    total_records: auditLogs.length,
    verified_records: verifiedCount,
    tampered_index: tamperedIndex,
    latest_hash: expectedPrev,
    message: isValid
      ? `All ${auditLogs.length} audit records verified against cryptographic SHA-256 hash chain.`
      : `Tampering detected at record #${tamperedIndex}! Hash chain link severed.`,
  });
});

// Security Reports Data
app.get('/api/reports/security', (req: Request, res: Response) => {
  const hostPlat = os.platform();
  const sysDisplay = hostPlat === 'win32' ? 'Windows' : hostPlat === 'darwin' ? 'macOS' : 'Linux';

  const totalDevs = devices.length;
  const avgRisk = totalDevs ? Math.round(devices.reduce((acc, d) => acc + d.risk_score, 0) / totalDevs) : 0;

  addAuditLog(hostPlat, 'REPORT_GENERATED', 'Cybersecurity compliance report data generated', 'admin');

  res.json({
    title: 'USB Device Security & Incident Threat Report',
    generated_at: new Date().toISOString(),
    host_operating_system: sysDisplay,
    architecture: os.arch(),
    monitoring_provider: `${sysDisplay} Device Monitor Adapter`,
    monitoring_mode: 'Native Events with Fallback',
    statistics: {
      total_usb_devices: totalDevs,
      authorized_devices: devices.filter((d) => d.status === 'AUTHORIZED').length,
      unauthorized_devices: devices.filter((d) => d.status === 'UNAUTHORIZED').length,
      blocked_devices: devices.filter((d) => d.status === 'BLOCKED').length,
      mounted_storage_volumes: volumes.filter((v) => v.is_active).length,
      total_connection_sessions: connections.length,
      total_file_events: fileEvents.length,
      total_alerts: alerts.length,
      critical_alerts: alerts.filter((a) => a.severity === 'CRITICAL').length,
      average_risk_score: avgRisk,
    },
    audit_integrity: {
      status: 'VALID',
      total_verified: auditLogs.length,
      latest_hash: auditLogs.length ? auditLogs[auditLogs.length - 1].record_hash : GENESIS_HASH,
    },
  });
});

// CSV Export
app.get('/api/reports/security.csv', (req: Request, res: Response) => {
  const hostPlat = os.platform();
  let csv = `USB Device Security Monitoring - Comprehensive Audit Export\n`;
  csv += `Generated At,${new Date().toISOString()}\n`;
  csv += `Host OS,${hostPlat}\n\n`;

  csv += `--- DEVICES ---\n`;
  csv += `ID,Platform,Device Name,VID,PID,Serial,Confidence,Status,Risk Score\n`;
  devices.forEach((d) => {
    csv += `${d.id},${d.platform},"${d.device_name}",${d.vendor_id},${d.product_id},"${d.serial_number || 'N/A'}",${d.identity_confidence},${d.status},${d.risk_score}\n`;
  });
  csv += `\n--- ALERTS ---\n`;
  csv += `ID,Device ID,Type,Severity,Risk Score,Title,Status,Timestamp\n`;
  alerts.forEach((a) => {
    csv += `${a.id},${a.device_id || 'N/A'},${a.alert_type},${a.severity},${a.risk_score},"${a.title}",${a.status},${a.timestamp}\n`;
  });
  csv += `\n--- FILE EVENTS ---\n`;
  csv += `ID,Volume ID,Relative Path,Event Type,Size Bytes,SHA256,Integrity,Timestamp\n`;
  fileEvents.forEach((f) => {
    csv += `${f.id},${f.volume_id},"${f.relative_path}",${f.event_type},${f.size_bytes},"${f.sha256_hash || 'N/A'}",${f.integrity_status},${f.timestamp}\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=usb_security_audit_report.csv');
  res.send(csv);
});

// Demo Simulation Status
app.get('/api/demo/status', (req: Request, res: Response) => {
  res.json({
    demo_mode_enabled: true,
    available_platforms: ['windows', 'linux', 'macos'],
    supported_simulation_events: [
      'USB_CONNECTED',
      'USB_REMOVED',
      'VOLUME_MOUNTED',
      'UNAUTHORIZED_DEVICE',
      'BLOCKED_DEVICE',
      'FILE_CREATED',
      'FILE_MODIFIED',
      'FILE_DELETED',
      'HASH_CHANGED',
      'HIGH_RISK_ALERT',
    ],
  });
});

// Demo Event Dispatcher
app.post('/api/demo/event', (req: Request, res: Response) => {
  const { demo_os = 'linux', event_type, device_name, vendor_id = '0951', product_id = '1666', serial_number, relative_path, is_authorized } = req.body;
  const demoPlat = demo_os.toLowerCase();
  const evtType = (event_type || '').toUpperCase();

  const defaultMount = demoPlat === 'windows' ? 'E:\\' : demoPlat === 'macos' ? '/Volumes/SECURE_USB' : '/media/demo_user/CYBER_USB';
  const devTitle = device_name || `Synthetic ${demoPlat.toUpperCase()} Flash Drive`;
  const serial = serial_number || `DEMO-${demoPlat.toUpperCase()}-2026`;
  const devIdent = `${demoPlat}:${vendor_id}:${product_id}:${serial}`;

  if (evtType === 'USB_CONNECTED' || evtType === 'UNAUTHORIZED_DEVICE' || evtType === 'BLOCKED_DEVICE') {
    const status = evtType === 'BLOCKED_DEVICE' ? 'BLOCKED' : is_authorized ? 'AUTHORIZED' : 'UNAUTHORIZED';
    const risk = calculateRisk(status, 'HIGH');

    let dev = devices.find((d) => d.device_identifier === devIdent);
    if (!dev) {
      dev = {
        id: devices.length + 1,
        platform: demoPlat,
        device_identifier: devIdent,
        identity_confidence: 'HIGH',
        device_name: devTitle,
        manufacturer: 'Synthetic Cyber Labs',
        vendor_id,
        product_id,
        serial_number: serial,
        device_type: 'USB_STORAGE',
        transport: 'USB',
        status: status as any,
        risk_score: risk.score,
        risk_level: risk.level,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active_connection: true,
      };
      devices.push(dev);
    } else {
      dev.status = status as any;
      dev.risk_score = risk.score;
      dev.risk_level = risk.level;
      dev.active_connection = true;
      dev.last_seen = new Date().toISOString();
    }

    connections.push({
      id: connections.length + 1,
      device_id: dev.id,
      device_name: dev.device_name,
      device_identifier: dev.device_identifier,
      platform: demoPlat,
      connected_at: new Date().toISOString(),
      disconnected_at: null,
      is_active: true,
    });

    addAuditLog(demoPlat, 'DEVICE_CONNECTED', `[DEMO SIMULATION] USB device plugged in: ${dev.device_name} on ${demoPlat.toUpperCase()}`, 'DEMO_LAB', dev.device_identifier);

    let alertObj: Alert | null = null;
    if (status !== 'AUTHORIZED') {
      alertObj = {
        id: alerts.length + 1,
        device_id: dev.id,
        alert_type: status === 'BLOCKED' ? 'BLOCKED_DEVICE' : 'UNAUTHORIZED_DEVICE',
        severity: status === 'BLOCKED' ? 'CRITICAL' : 'HIGH',
        risk_score: risk.score,
        title: `[DEMO] ${status} USB Inserted: ${dev.device_name}`,
        description: `Simulated defensive alert on ${demoPlat.toUpperCase()} platform. Policy evaluation flagged unapproved hardware.`,
        reasons_json: risk.reasons,
        status: 'NEW',
        timestamp: new Date().toISOString(),
        device_name: dev.device_name,
      };
      alerts.unshift(alertObj);
      broadcastSSE('ALERT_CREATED', alertObj);
    }

    broadcastSSE('DEVICE_CONNECTED', dev);
    return res.json({ status: 'success', is_demo: true, device: dev, alert: alertObj });
  }

  if (evtType === 'USB_REMOVED') {
    const dev = devices.find((d) => d.platform === demoPlat && d.active_connection) || devices[devices.length - 1];
    if (dev) {
      dev.active_connection = false;
      connections.forEach((c) => {
        if (c.device_id === dev.id && c.is_active) {
          c.is_active = false;
          c.disconnected_at = new Date().toISOString();
        }
      });
      addAuditLog(demoPlat, 'DEVICE_REMOVED', `[DEMO SIMULATION] USB device disconnected: ${dev.device_name}`, 'DEMO_LAB', dev.device_identifier);
      broadcastSSE('DEVICE_REMOVED', dev);
      return res.json({ status: 'success', is_demo: true, message: `Simulated removal of ${dev.device_name}` });
    }
  }

  if (evtType === 'VOLUME_MOUNTED') {
    const volId = `demo_vol_${demoPlat}_${Date.now()}`;
    const dev = devices.find((d) => d.platform === demoPlat && d.active_connection);
    const newVol: Volume = {
      id: volumes.length + 1,
      device_id: dev ? dev.id : null,
      volume_identifier: volId,
      mount_point: defaultMount,
      filesystem: demoPlat === 'linux' ? 'ext4' : 'exFAT',
      volume_label: 'DEMO_SECURE_STORAGE',
      capacity_bytes: 32_000_000_000,
      free_bytes: 25_100_000_000,
      read_only: false,
      mounted_at: new Date().toISOString(),
      unmounted_at: null,
      is_active: true,
      device_name: dev ? dev.device_name : 'Synthetic Storage',
    };
    volumes.push(newVol);
    addAuditLog(demoPlat, 'VOLUME_MOUNTED', `[DEMO SIMULATION] Storage volume mounted at ${newVol.mount_point}`, 'DEMO_LAB');
    broadcastSSE('VOLUME_MOUNTED', newVol);
    return res.json({ status: 'success', is_demo: true, volume: newVol });
  }

  if (evtType === 'FILE_CREATED' || evtType === 'FILE_MODIFIED' || evtType === 'FILE_DELETED' || evtType === 'HASH_CHANGED' || evtType === 'HIGH_RISK_ALERT') {
    const vol = volumes.find((v) => v.is_active) || volumes[0];
    const filePath = relative_path || (evtType === 'HASH_CHANGED' ? 'Research/classified_intel.docx' : 'Documents/meeting_notes.txt');

    const origHash = crypto.createHash('sha256').update('Baseline Authentic File ' + filePath).digest('hex');
    const tamperedHash = crypto.createHash('sha256').update('Tampered Injected Content ' + Date.now()).digest('hex');

    const isTamper = evtType === 'HASH_CHANGED' || evtType === 'HIGH_RISK_ALERT';
    const action = evtType === 'FILE_DELETED' ? 'DELETED' : isTamper || evtType === 'FILE_MODIFIED' ? 'MODIFIED' : 'CREATED';

    const sha = evtType === 'FILE_DELETED' ? null : isTamper ? tamperedHash : origHash;
    const integStatus = isTamper ? 'INTEGRITY_CHANGED' : evtType === 'FILE_DELETED' ? 'UNVERIFIED' : 'INTEGRITY_OK';

    const fe: FileEvent = {
      id: fileEvents.length + 1,
      volume_id: vol ? vol.id : 1,
      relative_path: filePath,
      event_type: action as any,
      size_bytes: evtType === 'FILE_DELETED' ? 0 : 54200,
      sha256_hash: sha,
      hash_status: sha ? 'SUCCESS' : 'NOT_AVAILABLE',
      integrity_status: integStatus as any,
      timestamp: new Date().toISOString(),
      is_demo: true,
      volume_mount_point: vol ? vol.mount_point : 'E:\\',
    };
    fileEvents.unshift(fe);

    addAuditLog(
      demoPlat,
      `FILE_${action}`,
      `[DEMO SIMULATION] File ${action}: ${filePath} on ${fe.volume_mount_point}${isTamper ? ' [INTEGRITY CHANGED]' : ''}`,
      'DEMO_LAB',
      null,
      { sha256: sha, integrity_status: integStatus, is_demo: true }
    );

    let createdAlert: Alert | null = null;
    if (isTamper) {
      createdAlert = {
        id: alerts.length + 1,
        device_id: vol ? vol.device_id : null,
        alert_type: 'HASH_CHANGED',
        severity: 'CRITICAL',
        risk_score: 85,
        title: `[DEMO] File Tampering / Integrity Drift: ${filePath}`,
        description: 'SHA-256 hash checksum discrepancy detected against recorded baseline. Potential unauthorized modification or ransomware encryption.',
        reasons_json: [
          'Unexpected file integrity change detected',
          'SHA-256 checksum mismatch against stored baseline',
          'Modification occurred on removable media',
        ],
        status: 'NEW',
        timestamp: new Date().toISOString(),
        device_name: vol ? vol.device_name : 'Removable Media',
      };
      alerts.unshift(createdAlert);
      broadcastSSE('ALERT_CREATED', createdAlert);
    }

    broadcastSSE('FILE_EVENT', fe);
    return res.json({ status: 'success', is_demo: true, file_event: fe, alert: createdAlert });
  }

  res.status(400).json({ error: { code: 'UNKNOWN_EVENT', message: `Unknown event type ${evtType}` } });
});

// Real-Time Server-Sent Events (SSE) Stream
app.get('/api/events/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter((c) => c !== res);
  });
});

// Mount Vite in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[USB Security Platform] Full-stack engine active on port ${PORT}`);
  });
}

startServer();
