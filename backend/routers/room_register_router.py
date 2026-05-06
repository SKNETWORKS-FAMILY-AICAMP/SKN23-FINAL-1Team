from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.session import get_db
from models.room import Room
from models.item_features import ItemFeatures

router = APIRouter(prefix="/rooms", tags=["rooms"])


class RoomRegisterRequest(BaseModel):
    user_id: int
    title: str
    address: str
    lat: float
    lng: float
    transaction_type: str = "monthly"
    deposit: int
    rent: int = 0
    manage_cost: int | None = None
    room_type: str | None = None
    floor: str | None = None
    all_floors: str | None = None
    area_m2: float | None = None
    bathroom_count: int | None = None
    room_direction: str | None = None
    residence_type: str | None = None
    approve_date: str | None = None
    movein_date: str | None = None
    description: str | None = None
    # 옵션
    has_air_con: bool = False
    has_fridge: bool = False
    has_washer: bool = False
    has_gas_stove: bool = False
    has_induction: bool = False
    has_microwave: bool = False
    has_desk: bool = False
    has_bed: bool = False
    has_closet: bool = False
    has_shoe_rack: bool = False
    has_bookcase: bool = False
    has_sink: bool = False
    has_parking: bool = False
    has_elevator: bool = False
    # 주변 환경
    is_subway_area: bool = False
    is_park_area: bool = False
    is_school_area: bool = False
    is_convenient_area: bool = False


@router.post("/register")
def register_room(payload: RoomRegisterRequest, db: Session = Depends(get_db)):
    max_9digit = db.query(func.max(Room.item_id)).filter(Room.item_id >= 100000000).scalar()
    new_item_id = (max_9digit + 1) if max_9digit else 100000000

    # service_type: monthly → 월세, jeonse → 전세
    service_type = "월세" if payload.transaction_type == "monthly" else "전세"

    room = Room(
        item_id=new_item_id,
        broker_id=payload.user_id,
        status="ACTIVE",
        title=payload.title,
        address=payload.address,
        lat=payload.lat,
        lng=payload.lng,
        deposit=payload.deposit,
        rent=payload.rent,
        manage_cost=payload.manage_cost,
        service_type=service_type,
        room_type=payload.room_type,
        floor=payload.floor,
        all_floors=payload.all_floors,
        area_m2=payload.area_m2,
    )
    db.add(room)
    db.flush()  # item_id 확정

    features = ItemFeatures(
        item_id=new_item_id,
        bathroom_count=payload.bathroom_count,
        room_direction=payload.room_direction,
        residence_type=payload.residence_type,
        approve_date=payload.approve_date,
        movein_date=payload.movein_date,
        options_raw=payload.description,
        has_air_con=payload.has_air_con,
        has_fridge=payload.has_fridge,
        has_washer=payload.has_washer,
        has_gas_stove=payload.has_gas_stove,
        has_induction=payload.has_induction,
        has_microwave=payload.has_microwave,
        has_desk=payload.has_desk,
        has_bed=payload.has_bed,
        has_closet=payload.has_closet,
        has_shoe_rack=payload.has_shoe_rack,
        has_bookcase=payload.has_bookcase,
        has_sink=payload.has_sink,
        has_parking=payload.has_parking,
        has_elevator=payload.has_elevator,
        is_subway_area=payload.is_subway_area,
        is_park_area=payload.is_park_area,
        is_school_area=payload.is_school_area,
        is_convenient_area=payload.is_convenient_area,
    )
    db.add(features)
    db.commit()
    db.refresh(room)

    return {
        "item_id": room.item_id,
        "title": room.title,
        "address": room.address,
        "status": room.status,
    }


@router.get("/my-rooms")
def get_my_rooms(user_id: int, db: Session = Depends(get_db)):
    rooms = db.query(Room).filter(Room.broker_id == user_id).all()
    return [
        {
            "item_id": r.item_id,
            "title": r.title,
            "address": r.address,
            "deposit": r.deposit,
            "rent": r.rent,
            "manage_cost": r.manage_cost,
            "room_type": r.room_type,
            "area_m2": float(r.area_m2) if r.area_m2 else None,
            "floor": r.floor,
            "status": r.status,
            "image_thumbnail": r.image_thumbnail,
            "service_type": r.service_type,
        }
        for r in rooms
    ]


@router.delete("/my-rooms/{item_id}")
def delete_my_room(item_id: int, user_id: int, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.item_id == item_id, Room.user_id == user_id).first()

    if not room:
        raise HTTPException(status_code=404, detail="매물을 찾을 수 없습니다.")

    db.delete(room)
    db.commit()

    return {"success": True, "item_id": item_id}