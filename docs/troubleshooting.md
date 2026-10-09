# Troubleshooting & Operational Guide

### 1. "Monitoring Provider: Polling Fallback"
- **Cause**: The native OS event library (`pyudev` on Linux, `pywin32` on Windows, or `PyObjC` on macOS) is not installed in the Python virtual environment.
- **Resolution**: The application continues operating seamlessly via periodic hardware polling (1–3s). To enable native OS event interrupts, install the platform-specific dependencies:
  - Windows: `pip install -r requirements-windows.txt`
  - Linux: `pip install -r requirements-linux.txt`
  - macOS: `pip install -r requirements-macos.txt`

### 2. "Permission Denied when hashing file"
- **Cause**: The file on the removable drive is exclusively locked by another process (e.g., active word processor, OS indexer, antivirus scanner).
- **Behavior**: The application catches `PermissionError`, flags `hash_status = "FAILED"`, and continues monitoring without crashing.

### 3. "Audit Log Integrity: COMPROMISED"
- **Cause**: A record in the `audit_logs` database table had its timestamp, description, or payload modified outside the application, or an audit record was deleted.
- **Resolution**: Inspect the `tampered_index` returned by `GET /api/audit-logs/integrity`. Review the database journal to identify unauthorized direct database tampering.

### 4. Demonstrating on a Laptop with No Physical Flash Drive Available
- **Solution**: Switch to **Simulation & Demo Mode** in the dashboard. The built-in simulator generates synthetic events for Windows, Linux, and macOS without requiring physical hardware.
