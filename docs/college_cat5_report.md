# College CAT Level 5 Cybersecurity Project Documentation

## Project Title
**USB Device Security Monitoring and Threat Detection System**  
*Cross-Platform Defensive Security, Device Authorization, SHA-256 File Integrity, and Incident Auditing for Windows, Linux, and macOS*

---

## 1. Problem Statement
Removable USB devices are one of the most persistent physical attack vectors in contemporary cybersecurity. Unrestricted USB ports facilitate:
1. **Malicious Keystroke Injection (BadUSB / Rubber Ducky)**: Hardware peripherals spoofing Human Interface Devices to execute terminal commands in milliseconds.
2. **Unauthorized Data Exfiltration**: Disgruntled insiders copying sensitive intellectual property onto unapproved personal storage media.
3. **Malware Delivery via Removable Media**: Worms and ransomware using USB partitions as an air-gap bridging mechanism.
4. **Silent Data Tampering**: Modification of critical files residing on portable storage without integrity baselines.

---

## 2. Existing System Limitations
Conventional endpoint tools often suffer from:
- **Operating System Lock-in**: Tools are built solely for Windows Active Directory or Linux `udev` rules, with no unified architecture.
- **Coarse Device Logging**: Systems log that a USB peripheral connected, but cannot distinguish between peripheral attachment and storage volume mounting.
- **Lack of Removable File Integrity**: Existing logs capture connection timestamps but fail to track SHA-256 checksum baselines of files on the removable drive.
- **Mutable Audit Logs**: Log entries in plain text files or standard database tables can be altered or erased by an adversary after compromising local access.

---

## 3. Proposed System
Our system implements a **Platform Abstraction Layer (PAL)** that provides identical defensive security controls across **Windows, Linux, and macOS**.
Key innovations include:
- **Separation of Hardware Connection vs Volume Mount vs File Activity**.
- **Hardware Identity Confidence Scoring (HIGH, MEDIUM, LOW)** based on serial stability and cryptographic hardware IDs.
- **SHA-256 Chunked Cryptographic Hashing** and baseline drift detection.
- **Explainable Defensive Risk Scoring (0–100)** with clear heuristic breakdown.
- **Tamper-Evident Audit Log Hash Chaining** ensuring cryptographic ledger verification.
- **Safe Simulation / Demo Lab** allowing students to demonstrate multi-OS behavior during viva examinations.

---

## 4. Key Objectives
1. Provide a single cross-platform platform that runs on Windows, Linux, and macOS without changing core security logic.
2. Accurately detect USB connect, disconnect, and volume mount/unmount lifecycles.
3. Classify devices as Authorized, Unauthorized, or Blocked according to security policy.
4. Calculate streaming SHA-256 hashes and flag unexpected file modifications.
5. Provide transparent, explainable heuristic threat risk scoring.
6. Guarantee audit log tamper-evidence using cryptographic hash chaining.
7. Deliver a professional React security dashboard with real-time incident notifications and PDF/CSV reporting.

---

## 5. Core Modules
1. **Platform Detection & Capabilities**: Dynamic introspection of host OS, architecture, and available provider APIs.
2. **USB Device Monitoring**: Hardware detection and event normalization.
3. **Identity Normalization & Confidence**: Scoring hardware serial and vendor confidence.
4. **Storage Volume Detector**: Decoupled detection of removable filesystems (`E:\`, `/media/...`, `/Volumes/...`).
5. **Policy Authorization Registry**: Administrative control over allowed, unauthorized, and blocked hardware.
6. **Removable File Activity Monitor**: Tracking created, modified, deleted, and renamed files on portable storage.
7. **SHA-256 Integrity Verification**: 64KB chunked file hashing and comparison against baseline records.
8. **Defensive Risk Engine**: Normalizing threat factors into a 0–100 score with granular reasons.
9. **Alert Generation & Triage**: Prioritizing incidents (INFO to CRITICAL) with acknowledge/resolve workflows.
10. **Cryptographic Audit Ledger**: Hash-chained immutable logs.
11. **Admin Authentication**: Rate-limited PBKDF2 authentication.
12. **React Security Dashboard**: Centralized management interface.
13. **Security Reporting**: On-demand PDF and CSV exports.
14. **Cross-Platform Simulation Lab**: Synthetic multi-OS demonstration engine.

---

## 6. Architecture & Data Flow
```text
Hardware / OS Event (Windows PnP / Linux udev / macOS IOKit)
  ↓
Platform Adapter Layer (NormalizedEvent)
  ↓
Common Orchestration Service (USBMonitorService)
  ↓
Security Policy & Risk Engine (calculate_device_risk)
  ↓
File Integrity & Hash Service (calculate_sha256)
  ↓
Audit Ledger with Hash Chaining (SHA-256 Link)
  ↓
REST API & Real-time Stream
  ↓
React Dashboard
```

---

## 7. Advantages & Real-World Benefits
- **Zero OS Lock-In**: Works across Windows, Linux, and macOS.
- **Local-First & Defensive**: Operates entirely offline without cloud dependency.
- **Tamper-Evident Verification**: Proves integrity of historical audit trails.
- **Live Demo Capability**: Viva examiners can test all three operating systems on a single development laptop.

---

## 8. Limitations
- Native hardware interrupts require platform-specific packages (`pyudev`, `pywin32`, `PyObjC`); without them, polling fallback activates.
- Risk scores are heuristic rather than full AI-based anomaly baselines.
- Filesystem differences (e.g. FAT32 timestamp resolution) can produce microsecond variance.

---

## 9. 5-Minute Live Viva Presentation Script

### Slide 1: Introduction (0:00 - 0:30)
> "Respected examiners, good morning. Today, I present our Level 5 cybersecurity project: The **USB Device Security Monitoring and Threat Detection System**. Removable media remains one of the most dangerous physical attack surfaces in enterprise security."

### Slide 2: The Problem & Gaps (0:30 - 1:15)
> "Conventional antivirus systems monitor running processes, but they lack fine-grained USB device authorization, multi-OS visibility, and cryptographic file integrity tracking on removable media. Furthermore, when an incident occurs, standard system logs can be easily cleared or altered by an attacker."

### Slide 3: Proposed Architecture (1:15 - 2:00)
> "Our solution solves this using an **Operating System Adapter Architecture**. Whether running on Windows, Ubuntu Linux, or macOS, the platform automatically detects the host, loads the native adapter (or activates an automatic polling fallback), and normalizes device events into a unified security model. Most importantly, we decouple hardware connection from storage volume mounting."

### Slide 4: Key Defensive Innovations (2:00 - 3:00)
> "The platform introduces three major technical components:
> First, **Identity Confidence Scoring**: We evaluate serial number stability and hardware IDs to assign HIGH, MEDIUM, or LOW confidence.
> Second, **SHA-256 Baseline Integrity**: Every file modified on a removable USB volume is hashed in 64KB streaming chunks to detect unapproved modifications.
> Third, **Audit Hash Chaining**: Every log entry is cryptographically linked to the previous entry using SHA-256, creating a tamper-evident blockchain-style ledger."

### Slide 5: Live Demonstration (3:00 - 4:15)
> "Let us look at the live dashboard. Notice the system status correctly identifies our operating system. 
> In the Demo Lab, we simulate an unauthorized USB flash drive insertion. Immediately, our Heuristic Risk Engine calculates a risk score of 50, flags it as HIGH severity, and triggers an incident alert.
> Next, we simulate file modification on the volume. The platform recalculates the SHA-256 checksum, notes a divergence from the baseline, and raises a CRITICAL Integrity Changed alert.
> Finally, we click 'Verify Audit Log Integrity'. The system scans the entire cryptographic chain and verifies that no records have been altered."

### Slide 6: Conclusion (4:15 - 5:00)
> "To conclude, this system delivers an educational, explainable, and production-ready defense tool for auditing and controlling USB devices across Windows, Linux, and macOS. Thank you, and I invite your questions."
