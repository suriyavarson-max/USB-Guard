# USB Device Security Monitoring and Threat Detection System

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![React 19](https://img.shields.io/badge/react-19-61dafb.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A complete, modular, defensive cybersecurity platform built for **Windows + Linux + macOS**. Designed as a **College CAT Level 5 Cybersecurity Project** for educational monitoring, auditing, hardware policy authorization, streaming SHA-256 file-integrity baselining, and incident detection.

---

## Architecture Overview

```text
                    COMMON APPLICATION CORE
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
           Windows          Linux           macOS
           Adapter          Adapter         Adapter
              |               |               |
              v               v               v
        Native OS APIs    udev / Linux    IOKit / macOS
                          device APIs      frameworks
```

The system uses an **Operating System Adapter Architecture (Platform Abstraction Layer)**. The common security algorithms (device authorization, heuristic risk scoring, file integrity verification, cryptographic audit hash chaining, and incident reporting) are completely independent of the operating system.

---

## Key Features

1. **Automatic Platform Detection**: Dynamically detects Windows, Linux, or macOS without hard-coded configurations.
2. **Hardware Connection vs Volume Decoupling**: Tracks hardware connection events independently from filesystem mounts.
3. **Identity Confidence Scoring**: Evaluates serial stability and vendor signatures into `HIGH`, `MEDIUM`, or `LOW` confidence levels.
4. **Streaming SHA-256 Hashing**: 64KB chunked file hashing on removable volumes without memory exhaustion.
5. **Baseline Tamper Drift Detection**: Flags unexpected file integrity changes (`INTEGRITY CHANGED`).
6. **Heuristic Risk Engine (0–100)**: Transparent risk scoring with explainable reasons (unauthorized, blocklisted, file deletion bursts).
7. **Tamper-Evident Audit Ledger**: Cryptographic SHA-256 hash chaining ($H_i = \text{SHA256}(H_{i-1} \parallel \text{Record})$).
8. **Interactive Cross-Platform Simulation Lab**: One-click viva defense demo for Windows, Linux, and macOS without requiring physical hardware.
9. **Executive Reporting**: One-click PDF audit report and CSV dataset export.
10. **Zero Cloud Lock-in**: 100% local-first defensive security tooling.

---

## Directory Structure

```text
USB-Security-Monitor/
│
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI application entry point
│   │   ├── database.py                # Database connection & session
│   │   ├── config.py                  # Platform-neutral app configuration
│   │   ├── models/models.py           # Database models (Devices, Volumes, Alerts, Logs)
│   │   ├── schemas/schemas.py         # Pydantic schemas
│   │   ├── security/auth.py           # PBKDF2 hashing, rate limiting, tokens
│   │   ├── services/                  # Risk engine, hashing, alert, audit services
│   │   └── platforms/
│   │       ├── base.py                # Abstract PAL interfaces
│   │       ├── capabilities.py        # Dynamic capability detection
│   │       ├── factory.py             # Automatic OS adapter factory
│   │       ├── common/                # Normalizer, volume detector, safe path utils
│   │       ├── windows/               # Windows native PnP & WMI adapter
│   │       ├── linux/                 # Linux native pyudev & sysfs adapter
│   │       └── macos/                 # macOS native IOKit & profiler adapter
│   ├── requirements.txt               # Common dependencies
│   ├── requirements-windows.txt       # Windows-specific dependencies
│   ├── requirements-linux.txt         # Linux-specific dependencies
│   └── requirements-macos.txt         # macOS-specific dependencies
│
├── src/                               # React 19 Frontend
│   ├── components/                    # Modular UI components
│   ├── pages/                         # Dashboard, Devices, Volumes, Alerts, Audit, Demo
│   ├── context/                       # Security & Auth state context (SSE Stream)
│   ├── services/api.ts                # REST client
│   └── App.tsx                        # Main application router
│
├── tests/                             # Test Suite
│   ├── unit/                          # Hash service, risk engine, audit chain tests
│   ├── platform/                      # Windows, Linux, macOS mocked provider tests
│   └── run_tests.py                   # Automated test runner
│
├── docs/                              # Academic & Technical Documentation
│   ├── architecture.md
│   ├── platform-support.md
│   ├── api.md
│   ├── security.md
│   ├── troubleshooting.md
│   └── college_cat5_report.md         # Full project report & 5-min presentation script
│
├── server.ts                          # Full-stack Node/Express dev & production server
└── README.md
```

---

## Quick Start Guide

### 1. Web Application (Full-Stack Dev Server)

```bash
# Install Node dependencies
npm install

# Start full-stack application (Port 3000)
npm run dev
```

Open your browser at `http://localhost:3000`.  
Default Administrator credentials:
- **Username**: `admin`
- **Password**: `admin123`

---

### 2. Standalone Python Backend

#### Windows (PowerShell)
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements-windows.txt
uvicorn app.main:app --reload --port 8000
```

#### Linux (Bash)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-linux.txt
uvicorn app.main:app --reload --port 8000
```

#### macOS (Terminal)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-macos.txt
uvicorn app.main:app --reload --port 8000
```

---

## Running Automated Tests

Run the full unit and platform mock test suite:
```bash
python3 tests/run_tests.py
```
Expected output:
```text
test_calculate_sha256_known_string ... ok
test_calculate_sha256_missing_file ... ok
test_authorized_clean_device_risk ... ok
test_blocked_device_critical_risk ... ok
test_audit_hash_chain_calculation ... ok
test_audit_hash_chain_tampering_detection ... ok
test_parse_windows_pnp_id ... ok
test_parse_linux_sysfs ... ok
test_parse_macos_system_profiler ... ok
----------------------------------------------------------------------
Ran 15 tests in 0.003s
OK
```

---

## 5-Minute Live Viva Demonstration Sequence

1. **Login & System Status**: Open dashboard; observe that the host operating system and hardware adapter are detected.
2. **Simulation Lab**: Switch demo OS to Windows, Linux, or macOS.
3. **Insert Unauthorized USB**: Risk score increases to 50; High-severity alert triggered.
4. **Mount Volume**: Storage partition mounted; file observer initializes.
5. **Create & Baseline File**: Monitored file created; initial SHA-256 fingerprint generated.
6. **Trigger Tamper Event**: File content modified; SHA-256 checksum mismatch triggers Critical Alert.
7. **Verify Audit Ledger**: Click **Verify Ledger Integrity**; cryptographic hash chain verifies all records sequentially.
8. **Export Reports**: Generate executive PDF report or download CSV logs.
