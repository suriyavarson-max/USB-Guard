# Cross-Platform Support Matrix

This matrix documents the verified capabilities of the USB Device Security Platform across operating systems.

| Security Feature | Windows 10/11 | Linux (Ubuntu/Debian) | macOS (Sonoma/Sequoia) |
| :--- | :--- | :--- | :--- |
| **USB Connect Detection** | Supported (PnP/WMI/Win32) | Supported (pyudev/sysfs) | Supported (IOKit/system_profiler) |
| **USB Removal Detection** | Supported | Supported | Supported |
| **Device Metadata Extraction** | Supported (VID, PID, PnP ID) | Supported (VID, PID, Serial) | Supported (VID, PID, Serial) |
| **Identity Confidence Scoring** | Supported (HIGH/MED/LOW) | Supported (HIGH/MED/LOW) | Supported (HIGH/MED/LOW) |
| **Storage Volume Mounts** | Supported (`D:\`, `E:\`, etc.) | Supported (`/media/...`) | Supported (`/Volumes/...`) |
| **File Activity Monitoring** | Supported (watchdog/polling) | Supported (watchdog/polling) | Supported (watchdog/polling) |
| **SHA-256 Hashing (Chunked)** | Supported | Supported | Supported |
| **Baseline Tamper Detection** | Supported | Supported | Supported |
| **Heuristic Risk Engine** | Supported (0–100 Normalized) | Supported (0–100 Normalized) | Supported (0–100 Normalized) |
| **Defensive Security Alerts** | Supported | Supported | Supported |
| **Cryptographic Audit Ledger**| Supported (SHA-256 Chain) | Supported (SHA-256 Chain) | Supported (SHA-256 Chain) |
| **PDF & CSV Audit Reports** | Supported | Supported | Supported |
| **Cross-Platform Demo Lab** | Supported (Safe Simulation) | Supported (Safe Simulation) | Supported (Safe Simulation) |
| **Polling Fallback Mode** | Supported (1–5s Interval) | Supported (1–5s Interval) | Supported (1–5s Interval) |

## Graceful Degradation Behavior
1. **Missing pywin32 / pyudev / PyObjC**: System automatically falls back to OS polling without throwing exceptions.
2. **Missing Hardware Serial**: Identity confidence drops to `MEDIUM` or `LOW` and adds +15 to device baseline risk score.
3. **Large Files (>50MB)**: Hashing is skipped (`SKIPPED`) to prevent UI and I/O freezing; manual verification is offered.
4. **Volume Removed Mid-Hash**: Caught gracefully (`NOT_AVAILABLE`), preventing crashed threads.
