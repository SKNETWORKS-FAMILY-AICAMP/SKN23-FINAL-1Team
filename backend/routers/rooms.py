from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.database import get_db
from schemas.room_schema import RoomListRequest
from services.room_service import get_rooms, get_map_items

router = APIRouter(prefix="/rooms", tags=["rooms"])

@router.post("/search")
def search_rooms(req: RoomListRequest, db: Session = Depends(get_db)):
    return get_rooms(db, req)

@router.post("/map-search")
def search_map_rooms(req: RoomListRequest, db: Session = Depends(get_db)):
    return get_map_items(db, req)