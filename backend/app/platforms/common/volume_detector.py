import sys
import shutil
from typing import List
from backend.app.platforms.base import NormalizedVolume
from backend.app.platforms.common.platform_utils import get_mount_disk_usage

def detect_mounted_volumes_cross_platform() -> List[NormalizedVolume]:
    """
    Safely inspects mounted partitions using cross-platform psutil or OS fallbacks.
    Works as fallback volume detection across Windows, Linux, and macOS.
    """
    volumes: List[NormalizedVolume] = []
    
    # Try psutil if installed
    try:
        import psutil # type: ignore
        partitions = psutil.disk_partitions(all=False)
        for part in partitions:
            mount = part.mountpoint
            fstype = part.fstype or "FAT32"
            opts = part.opts
            
            is_removable = False
            if sys.platform.startswith("win"):
                if "removable" in opts.lower() or "cdrom" in opts.lower() or part.device.startswith(("D:", "E:", "F:", "G:", "H:")):
                    is_removable = True
            elif sys.platform.startswith("linux"):
                if mount.startswith(("/media/", "/run/media/")):
                    is_removable = True
            elif sys.platform.startswith("darwin"):
                if mount.startswith("/Volumes/") and mount != "/Volumes/Macintosh HD":
                    is_removable = True

            if is_removable:
                total, free = get_mount_disk_usage(mount)
                vol_id = f"vol_{abs(hash(mount)) % 1000000:06d}"
                volumes.append(
                    NormalizedVolume(
                        volume_identifier=vol_id,
                        mount_point=mount,
                        filesystem=fstype,
                        volume_label=mount.split("/")[-1] or mount.split("\\")[-1] or "USB_MEDIA",
                        capacity_bytes=total,
                        free_bytes=free,
                        read_only="ro" in opts.lower()
                    )
                )
        return volumes
    except ImportError:
        pass
    except Exception:
        pass

    # Native fallback for Linux via /proc/mounts
    if sys.platform.startswith("linux"):
        try:
            with open("/proc/mounts", "r") as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) >= 3:
                        dev, mount, fstype = parts[0], parts[1], parts[2]
                        if mount.startswith(("/media/", "/run/media/")):
                            total, free = get_mount_disk_usage(mount)
                            vol_id = f"vol_{abs(hash(mount)) % 1000000:06d}"
                            volumes.append(
                                NormalizedVolume(
                                    volume_identifier=vol_id,
                                    mount_point=mount,
                                    filesystem=fstype,
                                    volume_label=mount.split("/")[-1] or "USB_MEDIA",
                                    capacity_bytes=total,
                                    free_bytes=free,
                                    read_only=False
                                )
                            )
        except Exception:
            pass

    return volumes
