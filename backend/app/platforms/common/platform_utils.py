import shutil
from pathlib import Path
from typing import Tuple, Optional

def is_path_safe_within_root(root_path: Path, target_path: Path) -> bool:
    """
    Ensures target_path resolves strictly within root_path.
    Prevents directory traversal attacks ('../') on removable volumes.
    """
    try:
        resolved_root = root_path.resolve()
        resolved_target = target_path.resolve()
        return resolved_target == resolved_root or resolved_root in resolved_target.parents
    except Exception:
        return False

def normalize_relative_path(root_path: Path, full_path: Path) -> str:
    """
    Returns a unified POSIX-style relative path from volume root.
    E.g. Windows E:\\Docs\\file.txt -> Docs/file.txt
    Linux /media/user/USB/Docs/file.txt -> Docs/file.txt
    """
    try:
        resolved_root = root_path.resolve()
        resolved_full = full_path.resolve()
        rel = resolved_full.relative_to(resolved_root)
        return rel.as_posix()
    except Exception:
        # Fallback to name if not relative
        return full_path.name

def get_mount_disk_usage(mount_point: str) -> Tuple[int, int]:
    """Returns (capacity_bytes, free_bytes) safely for any mount point."""
    try:
        usage = shutil.disk_usage(mount_point)
        return usage.total, usage.free
    except Exception:
        return 0, 0
