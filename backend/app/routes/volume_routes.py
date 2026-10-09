from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.models import USBVolume, USBDevice
from backend.app.schemas.schemas import USBVolumeOut

router = APIRouter(prefix="/api/volumes", tags=["USB Storage Volumes"])

@router.get("", response_model=List[USBVolumeOut])
def list_volumes(db: Session = Depends(get_db)):
    vols = db.query(USBVolume).order_by(USBVolume.mounted_at.desc()).all()
    results = []
    for v in vols:
        dev_name = None
        if v.device_id:
            dev = db.query(USBDevice).filter(USBDevice.id == v.device_id).first()
            if dev:
                dev_name = dev.device_name
        out = USBVolumeOut.from_orm(v)
        out.device_name = dev_name
        results.append(out)
    return results

@router.get("/{volume_id}", response_model=USBVolumeOut)
def get_volume(volume_id: int, db: Session = Depends(get_db)):
    vol = db.query(USBVolume).filter(USBVolume.id == volume_id).first()
    if not vol:
        raise HTTPException(status_code=404, detail="Volume not found.")
    dev_name = None
    if vol.device_id:
        dev = db.query(USBDevice).filter(USBDevice.id == vol.device_id).first()
        if dev:
            dev_name = dev.device_name
    out = USBVolumeOut.from_orm(vol)
    out.device_name = dev_name
    return out
