from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.session import get_db
from schemas.room_schema import RoomListRequest, RoomListResponse
from services.room_service import get_rooms

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("/search", response_model=RoomListResponse)
def search_rooms(payload: RoomListRequest, db: Session = Depends(get_db)):
    result = get_rooms(db, payload)
    return result
