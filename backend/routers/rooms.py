from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.session import get_db
from schemas.room_schema import (
    RoomListResponse,
    RoomMapSearchRequest,
    RoomSearchRequest,
)
from services.room_service import search_rooms, search_rooms_for_map

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("/search", response_model=RoomListResponse)
def rooms_search(req: RoomSearchRequest, db: Session = Depends(get_db)):
    return search_rooms(db, req)


@router.post("/map-search", response_model=RoomListResponse)
def rooms_map_search(req: RoomMapSearchRequest, db: Session = Depends(get_db)):
    return search_rooms_for_map(db, req)