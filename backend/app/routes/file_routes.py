from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.models import FileEvent, USBVolume
from backend.app.schemas.schemas import FileEventOut

router = APIRouter(prefix="/api/file-events", tags=["File Events"])

@router.get("", response_model=List[FileEventOut])
def list_file_events(
    volume_id: Optional[int] = Query(None, description="Filter by volume ID"),
    event_type: Optional[str] = Query(None, description="CREATED, MODIFIED, DELETED, RENAMED"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(FileEvent)
    if volume_id:
        query = query.filter(FileEvent.volume_id == volume_id)
    if event_type:
        query = query.filter(FileEvent.event_type == event_type.upper())
    
    events = query.order_by(FileEvent.timestamp.desc()).limit(limit).all()
    results = []
    for ev in events:
        vol = db.query(USBVolume).filter(USBVolume.id == ev.volume_id).first()
        out = FileEventOut.from_orm(ev)
        out.volume_mount_point = vol.mount_point if vol else "Unknown"
        results.append(out)
    return results
