import {
  USBDevice,
  USBVolume,
  FileEvent,
  Alert,
  AuditLog,
  PlatformStatus,
  DashboardSummary,
  AuditIntegrityResult,
  User,
} from '../types';

const BASE_URL = '/api';

export const api = {
  // Platform
  async getPlatform(): Promise<any> {
    const res = await fetch(`${BASE_URL}/platform`);
    return res.json();
  },

  async getPlatformStatus(): Promise<PlatformStatus> {
    const res = await fetch(`${BASE_URL}/platform/status`);
    return res.json();
  },

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${BASE_URL}/dashboard/summary`);
    return res.json();
  },

  // Devices
  async getDevices(params?: { status?: string; search?: string; platform?: string }): Promise<USBDevice[]> {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    if (params?.platform) q.append('platform', params.platform);
    const res = await fetch(`${BASE_URL}/devices?${q.toString()}`);
    return res.json();
  },

  async getDevice(id: number): Promise<USBDevice> {
    const res = await fetch(`${BASE_URL}/devices/${id}`);
    return res.json();
  },

  async authorizeDevice(id: number): Promise<USBDevice> {
    const res = await fetch(`${BASE_URL}/devices/${id}/authorize`, { method: 'POST' });
    return res.json();
  },

  async blockDevice(id: number): Promise<USBDevice> {
    const res = await fetch(`${BASE_URL}/devices/${id}/block`, { method: 'POST' });
    return res.json();
  },

  async unblockDevice(id: number): Promise<USBDevice> {
    const res = await fetch(`${BASE_URL}/devices/${id}/unblock`, { method: 'POST' });
    return res.json();
  },

  async getConnections(): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/connections`);
    return res.json();
  },

  // Volumes
  async getVolumes(): Promise<USBVolume[]> {
    const res = await fetch(`${BASE_URL}/volumes`);
    return res.json();
  },

  async getVolume(id: number): Promise<USBVolume> {
    const res = await fetch(`${BASE_URL}/volumes/${id}`);
    return res.json();
  },

  // File Events
  async getFileEvents(params?: { volume_id?: number; event_type?: string; limit?: number }): Promise<FileEvent[]> {
    const q = new URLSearchParams();
    if (params?.volume_id) q.append('volume_id', params.volume_id.toString());
    if (params?.event_type) q.append('event_type', params.event_type);
    if (params?.limit) q.append('limit', params.limit.toString());
    const res = await fetch(`${BASE_URL}/file-events?${q.toString()}`);
    return res.json();
  },

  // Alerts
  async getAlerts(params?: { severity?: string; status?: string }): Promise<Alert[]> {
    const q = new URLSearchParams();
    if (params?.severity) q.append('severity', params.severity);
    if (params?.status) q.append('status', params.status);
    const res = await fetch(`${BASE_URL}/alerts?${q.toString()}`);
    return res.json();
  },

  async updateAlert(id: number, status: 'ACKNOWLEDGED' | 'RESOLVED'): Promise<Alert> {
    const res = await fetch(`${BASE_URL}/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  // Audit Logs
  async getAuditLogs(params?: { event_type?: string; platform?: string; limit?: number }): Promise<AuditLog[]> {
    const q = new URLSearchParams();
    if (params?.event_type) q.append('event_type', params.event_type);
    if (params?.platform) q.append('platform', params.platform);
    if (params?.limit) q.append('limit', params.limit.toString());
    const res = await fetch(`${BASE_URL}/audit-logs?${q.toString()}`);
    return res.json();
  },

  async verifyAuditIntegrity(): Promise<AuditIntegrityResult> {
    const res = await fetch(`${BASE_URL}/audit-logs/integrity`);
    return res.json();
  },

  // Reports
  async getSecurityReport(): Promise<any> {
    const res = await fetch(`${BASE_URL}/reports/security`);
    return res.json();
  },

  // Demo Lab & Simulation
  async triggerDemoEvent(payload: {
    demo_os: string;
    event_type: string;
    device_name?: string;
    vendor_id?: string;
    product_id?: string;
    serial_number?: string;
    relative_path?: string;
    is_authorized?: boolean;
  }): Promise<any> {
    const res = await fetch(`${BASE_URL}/demo/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Auth
  async login(username: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Authentication failed');
    }
    return res.json();
  },

  async logout(): Promise<void> {
    await fetch(`${BASE_URL}/auth/logout`, { method: 'POST' });
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${BASE_URL}/auth/me`);
    return res.json();
  },
};
