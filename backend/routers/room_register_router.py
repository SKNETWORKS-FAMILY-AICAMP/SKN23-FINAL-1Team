import uuid
import os
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.session import get_db
from models.room import Room
from models.item_features import ItemFeatures
from models.item_image import ItemImage
from utils.s3 import get_s3_client

router = APIRouter(prefix="/rooms", tags=["rooms"])

BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "")
logger = logging.getLogger(__name__)


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
    image_thumbnail: str | None = None
    image_urls: list[str] = []
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
    is_subway_area: bool = False
    is_park_area: bool = False
    is_school_area: bool = False
    is_convenient_area: bool = False


class UpdateImagesRequest(BaseModel):
    item_id: int
    image_thumbnail: str | None = None
    image_urls: list[str] = []


@router.post("/upload-image")
async def upload_room_image(
    file: UploadFile = File(...),
    item_id: int = Form(0),
    index: int = Form(0),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    date_str = datetime.now().strftime("%Y-%m-%d")
    key = f"zigbang_data/images/seoul/{date_str}/{item_id}/{item_id}_{index + 1}.{ext}"

    try:
        s3 = get_s3_client()
        contents = await file.read()
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=contents,
            ContentType=file.content_type,
        )
        s3_uri = f"s3://{BUCKET_NAME}/{key}"
        return {"url": s3_uri}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"업로드 실패: {str(e)}")


@router.post("/register")
async def register_room(request: Request, payload: RoomRegisterRequest, db: Session = Depends(get_db)):
    try:
        max_9digit = db.query(func.max(Room.item_id)).filter(Room.item_id >= 100000000).scalar()
        new_item_id = (max_9digit + 1) if max_9digit else 100000000

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
            image_thumbnail=payload.image_thumbnail,
        )
        db.add(room)
        db.flush()

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

        for idx, url in enumerate(payload.image_urls):
            image = ItemImage(
                item_id=new_item_id,
                s3_url=url,
                is_main=(idx == 0),
            )
            db.add(image)

        db.commit()
        db.refresh(room)

        return {
            "item_id": room.item_id,
            "title": room.title,
            "address": room.address,
            "status": room.status,
        }

    except Exception as e:
        logger.error(f"register_room error: {e}")
        body = await request.body()
        logger.error(f"request body: {body}")
        raise


@router.patch("/update-images")
def update_room_images(payload: UpdateImagesRequest, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.item_id == payload.item_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="매물을 찾을 수 없습니다.")

    room.image_thumbnail = payload.image_thumbnail

    for idx, url in enumerate(payload.image_urls):
        image = ItemImage(
            item_id=payload.item_id,
            s3_url=url,
            is_main=(idx == 0),
        )
        db.add(image)

    db.commit()
    return {"success": True}


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
    room = db.query(Room).filter(Room.item_id == item_id, Room.broker_id == user_id).first()

    if not room:
        raise HTTPException(status_code=404, detail="매물을 찾을 수 없습니다.")

    db.delete(room)
    db.commit()

    return {"success": True, "item_id": item_id}