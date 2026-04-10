from sqlalchemy import select
from sqlalchemy.orm import selectinload, joinedload
from utils.s3_utils import create_presigned_get_url

from models.room import Room
from schemas.room_detail_schema import (
    RoomDetailResponse,
    RoomDetailItemResponse,
    RoomFeatureResponse,
    RoomImageResponse,
)

def s3_to_https_url(s3_uri: str) -> str:
    if not s3_uri:
        return s3_uri

    if not s3_uri.startswith("s3://"):
        return s3_uri

    without_scheme = s3_uri.replace("s3://", "", 1)
    bucket, key = without_scheme.split("/", 1)
    return f"https://{bucket}.s3.ap-northeast-2.amazonaws.com/{key}"


def get_room_detail(db, item_id: int):
    stmt = (
        select(Room)
        .where(Room.item_id == item_id)
        .options(
            joinedload(Room.features),
            selectinload(Room.images),
        )
    )

    room = db.execute(stmt).scalar_one_or_none()

    if room is None:
        return None

    feature_payload = None
    if room.features:
        feature_payload = RoomFeatureResponse(
            has_parking=room.features.has_parking,
            parking_count=float(room.features.parking_count)
            if room.features.parking_count is not None
            else None,
            has_elevator=room.features.has_elevator,
            bathroom_count=room.features.bathroom_count,
            residence_type=room.features.residence_type,
            room_direction=room.features.room_direction,
            movein_date=room.features.movein_date.isoformat()
            if room.features.movein_date
            else None,
            approve_date=room.features.approve_date.isoformat()
            if room.features.approve_date
            else None,
            has_air_con=room.features.has_air_con,
            has_fridge=room.features.has_fridge,
            has_washer=room.features.has_washer,
            has_gas_stove=room.features.has_gas_stove,
            has_induction=room.features.has_induction,
            has_microwave=room.features.has_microwave,
            has_desk=room.features.has_desk,
            has_bed=room.features.has_bed,
            has_closet=room.features.has_closet,
            has_shoe_rack=room.features.has_shoe_rack,
            has_bookcase=room.features.has_bookcase,
            has_sink=room.features.has_sink,
            dist_subway=room.features.dist_subway,
            dist_pharmacy=room.features.dist_pharmacy,
            dist_conv=room.features.dist_conv,
            dist_bus=room.features.dist_bus,
            dist_mart=room.features.dist_mart,
            dist_laundry=room.features.dist_laundry,
            dist_cafe=room.features.dist_cafe,
            is_coupang=room.features.is_coupang,
            is_ssg=room.features.is_ssg,
            is_marketkurly=room.features.is_marketkurly,
            is_baemin=room.features.is_baemin,
            is_yogiyo=room.features.is_yogiyo,
            is_subway_area=room.features.is_subway_area,
            is_convenient_area=room.features.is_convenient_area,
            is_park_area=room.features.is_park_area,
            is_school_area=room.features.is_school_area,
            options_raw=room.features.options_raw,
            amenities_raw=room.features.amenities_raw,
        )

    image_payload = [
        RoomImageResponse(
            id=image.id,
            url=create_presigned_get_url(image.s3_url, expires_in=3600),
            is_main=image.is_main,
        )
        for image in sorted(
            room.images,
            key=lambda img: (
                not bool(img.is_main),
                img.id,
            ),
        )
    ]

    return RoomDetailResponse(
        item=RoomDetailItemResponse.model_validate(room),
        features=feature_payload,
        images=image_payload,
    )