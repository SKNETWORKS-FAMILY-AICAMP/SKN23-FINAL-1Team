from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.session import get_db
from schemas.room_detail_schema import RoomDetailResponse
from services.room_detail_service import get_room_detail

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.get("/{item_id}", response_model=RoomDetailResponse)
def read_room_detail(item_id: int, db: Session = Depends(get_db)):
    result = get_room_detail(db, item_id)

    if result is None:
        raise HTTPException(status_code=404, detail="매물을 찾을 수 없습니다.")

    return result