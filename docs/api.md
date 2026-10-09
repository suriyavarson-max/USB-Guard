# REST API Reference & Specification

## Base URL
Default local endpoint: `http://127.0.0.1:8000` (or `http://localhost:3000` via fullstack development server).

---

### Platform Diagnostics
- **`GET /api/platform`**: Returns host OS, family, architecture, active provider name, and monitoring mode.
- **`GET /api/platform/capabilities`**: Boolean flags for native events, polling, hashing, etc.
- **`GET /api/platform/status`**: Detailed health status of adapters and workers.

---

### Authentication & Sessions
- **`POST /api/auth/login`**: Authenticate administrator (`username`, `password`). Rate-limited to 5 attempts/min.
- **`POST /api/auth/logout`**: Terminate session and audit logout.
- **`GET /api/auth/me`**: Current authenticated user details.

---

### Dashboard & Analytics
- **`GET /api/dashboard/summary`**: Aggregated security posture (connected, authorized, blocked devices, mounted volumes, alerts, risk average, audit integrity status).

---

### USB Devices
- **`GET /api/devices`**: List devices with filtering (`status`, `platform`, `search`).
- **`GET /api/devices/{id}`**: Detailed device hardware profile and volume links.
- **`POST /api/devices/{id}/authorize`**: Mark device as authorized policy.
- **`POST /api/devices/{id}/block`**: Place device on security blocklist.
- **`POST /api/devices/{id}/unblock`**: Remove from blocklist.
- **`GET /api/connections`**: Historical USB connection sessions.

---

### Removable Storage Volumes
- **`GET /api/volumes`**: List active and historical mounted partitions (`mount_point`, `filesystem`, `capacity_bytes`, `free_bytes`).
- **`GET /api/volumes/{id}`**: Detailed volume metrics.

---

### Removable File Activity
- **`GET /api/file-events`**: Log of file changes on removable media (`relative_path`, `event_type`, `sha256_hash`, `integrity_status`).

---

### Security Alerts
- **`GET /api/alerts`**: Filterable alert log (`severity`: INFO/LOW/MEDIUM/HIGH/CRITICAL, `status`: NEW/ACKNOWLEDGED/RESOLVED).
- **`PATCH /api/alerts/{id}`**: Update alert triage status (`ACKNOWLEDGED` or `RESOLVED`).

---

### Audit Ledger & Integrity
- **`GET /api/audit-logs`**: Complete historical immutable action log.
- **`GET /api/audit-logs/integrity`**: Cryptographic verification recalculating SHA-256 hash chains.

---

### Reports & Compliance
- **`GET /api/reports/security`**: Summary posture payload.
- **`GET /api/reports/security.csv`**: Comprehensive comma-separated audit export.

---

### Simulation & Demo Lab
- **`GET /api/demo/status`**: Demo capabilities and supported simulation events.
- **`POST /api/demo/event`**: Trigger synthetic events (`USB_CONNECTED`, `UNAUTHORIZED_DEVICE`, `VOLUME_MOUNTED`, `FILE_MODIFIED`, `HASH_CHANGED`, etc.) across `windows`, `linux`, or `macos`.
