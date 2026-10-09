# Cybersecurity Principles & Defensive Architecture

## 1. Defensive Boundaries (What We Do vs What We Do Not Do)

This platform is engineered as a **defensive, monitoring, auditing, and threat detection tool** for academic defense and institutional protection.

| System Capability | Defensive Implementation | Prohibited / Out-of-Scope Behavior |
| :--- | :--- | :--- |
| **Device Control** | Policy authorization & blocklist flagging | Destructive firmware flashing or driver bricking |
| **Filesystem Access** | Read-only metadata extraction & SHA-256 calculation | Automatic binary execution or arbitrary file deletion |
| **Telemetry** | Local-first storage (`sqlite3` / application data dir) | Outbound cloud exfiltration or third-party tracking |
| **Privileges** | Standard non-elevated user permissions | Unnecessary `sudo` / `Administrator` escalation |

## 2. Directory Traversal Hardening

Removable storage monitoring enforces strict boundary checking:
```python
def is_path_safe_within_root(root_path: Path, target_path: Path) -> bool:
    resolved_root = root_path.resolve()
    resolved_target = target_path.resolve()
    return resolved_target == resolved_root or resolved_root in resolved_target.parents
```
Any event containing directory traversal attempts (`../../etc/passwd` or `..\Windows\System32`) is immediately blocked from inspection.

## 3. Cryptographic Tamper-Evidence

Audit records cannot be silently rewritten by an attacker. Every entry computes:
```text
record_hash = SHA256(previous_hash + timestamp + platform + event_type + actor + identifier + description + details)
```
Any database record modification invalidates all subsequent links in the ledger, alerting the security administrator.
