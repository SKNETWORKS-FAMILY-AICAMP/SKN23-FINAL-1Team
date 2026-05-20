from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse, StreamingResponse
from sqlalchemy.orm import Session

from db.session import get_db
from models.item_image import ItemImage
from schemas.room_detail_schema import RoomDetailResponse
from services.room_detail_service import get_room_detail
from utils.s3 import get_s3_client, parse_s3_uri

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.get("/{item_id:int}/images/{image_id:int}")
def read_room_image(item_id: int, image_id: int, db: Session = Depends(get_db)):
    image = (
        db.query(ItemImage)
        .filter(ItemImage.item_id == item_id, ItemImage.id == image_id)
        .first()
    )

    if image is None:
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")

    image_url = image.s3_url

    if image_url.startswith("http://") or image_url.startswith("https://"):
        return RedirectResponse(image_url)

    if not image_url.startswith("s3://"):
        raise HTTPException(status_code=400, detail="지원하지 않는 이미지 경로입니다.")

    try:
        bucket, key = parse_s3_uri(image_url)
        s3_object = get_s3_client().get_object(Bucket=bucket, Key=key)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="이미지를 불러올 수 없습니다.") from exc

    return StreamingResponse(
        s3_object["Body"],
        media_type=s3_object.get("ContentType") or "image/jpeg",
        headers={
            "Cache-Control": "private, max-age=3600",
        },
    )


@router.get("/{item_id:int}", response_model=RoomDetailResponse)
def read_room_detail(item_id: int, db: Session = Depends(get_db)):
    result = get_room_detail(db, item_id)

    if result is None:
        raise HTTPException(status_code=404, detail="매물을 찾을 수 없습니다.")

    return result
