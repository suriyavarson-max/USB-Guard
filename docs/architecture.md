# System Architecture & Technical Specifications

## 1. Overview

The **USB Device Security Monitoring and Threat Detection Platform** is a defensive, local-first endpoint cybersecurity platform engineered for **Windows, Linux, and macOS**. It safeguards corporate and academic computing environments from malicious USB attacks (such as Rubber Ducky keystroke injection devices, unauthorized mass storage exfiltration, unapproved flash drives, and data tampering).

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

## 2. Platform Abstraction Layer (PAL)

To prevent OS-specific logic from leaking into core defensive algorithms, the system adheres to strict layer isolation:

1. **`USBDeviceProvider` (Abstract)**:
   - `list_devices()`: Enumerates attached USB peripherals.
   - `watch_events(callback)`: Hooks native OS events (or starts polling fallback).
   - `stop_watching()`: Gracefully halts watcher threads.

2. **`VolumeProvider` (Abstract)**:
   - `list_removable_volumes()`: Discovers storage volumes mounted to removable media.
   - `watch_mount_events(callback)`: Real-time notification of mount/unmount.

3. **`PlatformCapabilities`**:
   - Dynamic introspection of supported OS features without crashing.

## 3. Storage and File Decoupling

A critical defensive principle: **A USB device connection does NOT guarantee a mounted filesystem.**
Peripherals such as USB keyboards, mice, CAN adapters, or unformatted flash drives do not expose filesystems.
Therefore, monitoring is tiered:
- **Level 1: Hardware Attachment** (`USBDeviceProvider`)
- **Level 2: Filesystem Mount** (`VolumeProvider`)
- **Level 3: Removable File Activity** (`VolumeFileObserver` & `hash_service`)

## 4. Cryptographic Hash Chaining

Audit logs are secured via a tamper-evident hash chain:
$$H_0 = 0000000000000000000000000000000000000000000000000000000000000000$$
$$H_i = \text{SHA-256}(H_{i-1} \parallel \text{Timestamp} \parallel \text{Platform} \parallel \text{Event} \parallel \text{Actor} \parallel \text{Identifier} \parallel \text{Payload})$$

If an adversary attempts to modify or delete a database row, any verification re-run immediately identifies the exact tampered index.
