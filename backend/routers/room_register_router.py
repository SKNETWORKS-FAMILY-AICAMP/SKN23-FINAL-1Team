import os
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, text

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
    dist_subway: int | None = None
    dist_bus: int | None = None
    dist_conv: int | None = None
    dist_mart: int | None = None
    dist_laundry: int | None = None


class UpdateImagesRequest(BaseModel):
    item_id: int
    image_thumbnail: str | None = None
    image_urls: list[str] = []


class RoomUpdateRequest(BaseModel):
    user_id: int
    title: str | None = None
    deposit: int | None = None
    rent: int | None = None
    manage_cost: int | None = None
    description: str | None = None
    status: str | None = None
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
    dist_subway: int | None = None
    dist_bus: int | None = None
    dist_conv: int | None = None
    dist_mart: int | None = None
    dist_laundry: int | None = None


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
        s3_uri = f"s3://{BUCKET_NAME}/{key}?w=1200"
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
            url="",
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
            recommendation_score=0.0,
        )
        db.add(room)
        db.flush()

        db.execute(
            text("UPDATE public.items SET geom = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326) WHERE item_id = :item_id"),
            {"lng": payload.lng, "lat": payload.lat, "item_id": new_item_id}
        )

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
            dist_subway=payload.dist_subway,
            dist_bus=payload.dist_bus,
            dist_conv=payload.dist_conv,
            dist_mart=payload.dist_mart,
            dist_laundry=payload.dist_laundry,
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
    result = []
    for r in rooms:
        main_image = db.query(ItemImage).filter(
            ItemImage.item_id == r.item_id,
            ItemImage.is_main == True
        ).first()

        thumbnail_url = None
        if main_image:
            thumbnail_url = f"/backend/api/rooms/{r.item_id}/images/{main_image.id}"

        features = db.query(ItemFeatures).filter(ItemFeatures.item_id == r.item_id).first()

        images = db.query(ItemImage).filter(ItemImage.item_id == r.item_id).all()
        image_list = [
            {"id": img.id, "url": f"/backend/api/rooms/{r.item_id}/images/{img.id}", "is_main": img.is_main}
            for img in images
        ]

        result.append({
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
            "image_thumbnail": thumbnail_url,
            "service_type": r.service_type,
            "lat": float(r.lat) if r.lat else None,
            "lng": float(r.lng) if r.lng else None,
            "images": image_list,
            "description": features.options_raw if features else None,
            "has_air_con": features.has_air_con if features else False,
            "has_fridge": features.has_fridge if features else False,
            "has_washer": features.has_washer if features else False,
            "has_gas_stove": features.has_gas_stove if features else False,
            "has_induction": features.has_induction if features else False,
            "has_microwave": features.has_microwave if features else False,
            "has_desk": features.has_desk if features else False,
            "has_bed": features.has_bed if features else False,
            "has_closet": features.has_closet if features else False,
            "has_shoe_rack": features.has_shoe_rack if features else False,
            "has_bookcase": features.has_bookcase if features else False,
            "has_sink": features.has_sink if features else False,
            "has_parking": features.has_parking if features else False,
            "has_elevator": features.has_elevator if features else False,
            "is_subway_area": features.is_subway_area if features else False,
            "is_park_area": features.is_park_area if features else False,
            "is_school_area": features.is_school_area if features else False,
            "is_convenient_area": features.is_convenient_area if features else False,
            "dist_subway": features.dist_subway if features else None,
            "dist_bus": features.dist_bus if features else None,
            "dist_conv": features.dist_conv if features else None,
            "dist_mart": features.dist_mart if features else None,
            "dist_laundry": features.dist_laundry if features else None,
        })
    return result


@router.patch("/my-rooms/{item_id}")
def update_my_room(item_id: int, payload: RoomUpdateRequest, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.item_id == item_id, Room.broker_id == payload.user_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="매물을 찾을 수 없습니다.")

    if payload.title is not None: room.title = payload.title
    if payload.deposit is not None: room.deposit = payload.deposit
    if payload.rent is not None: room.rent = payload.rent
    if payload.manage_cost is not None: room.manage_cost = payload.manage_cost
    if payload.status is not None: room.status = payload.status

    features = db.query(ItemFeatures).filter(ItemFeatures.item_id == item_id).first()
    if features:
        features.options_raw = payload.description
        features.has_air_con = payload.has_air_con
        features.has_fridge = payload.has_fridge
        features.has_washer = payload.has_washer
        features.has_gas_stove = payload.has_gas_stove
        features.has_induction = payload.has_induction
        features.has_microwave = payload.has_microwave
        features.has_desk = payload.has_desk
        features.has_bed = payload.has_bed
        features.has_closet = payload.has_closet
        features.has_shoe_rack = payload.has_shoe_rack
        features.has_bookcase = payload.has_bookcase
        features.has_sink = payload.has_sink
        features.has_parking = payload.has_parking
        features.has_elevator = payload.has_elevator
        features.is_subway_area = payload.is_subway_area
        features.is_park_area = payload.is_park_area
        features.is_school_area = payload.is_school_area
        features.is_convenient_area = payload.is_convenient_area
        features.dist_subway = payload.dist_subway
        features.dist_bus = payload.dist_bus
        features.dist_conv = payload.dist_conv
        features.dist_mart = payload.dist_mart
        features.dist_laundry = payload.dist_laundry

    db.commit()
    return {"success": True}


@router.delete("/my-rooms/{item_id}/images/{image_id}")
def delete_room_image(item_id: int, image_id: int, user_id: int, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.item_id == item_id, Room.broker_id == user_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="매물을 찾을 수 없습니다.")

    image = db.query(ItemImage).filter(ItemImage.id == image_id, ItemImage.item_id == item_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")

    was_main = image.is_main
    db.delete(image)
    db.flush()

    if was_main:
        next_image = db.query(ItemImage).filter(ItemImage.item_id == item_id).first()
        if next_image:
            next_image.is_main = True
            room.image_thumbnail = f"s3://{BUCKET_NAME}/{next_image.s3_url}"
        else:
            room.image_thumbnail = None

    db.commit()
    return {"success": True}


@router.delete("/my-rooms/{item_id}")
def delete_my_room(item_id: int, user_id: int, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.item_id == item_id, Room.broker_id == user_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="매물을 찾을 수 없습니다.")

    db.delete(room)
    db.commit()
    return {"success": True, "item_id": item_id}