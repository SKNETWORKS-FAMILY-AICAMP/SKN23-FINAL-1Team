from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from db.session import get_db
from schemas.gallery_schema import GallerySaveRequest, GalleryItemResponse, GalleryListResponse
from services.gallery_service import save_gallery_image, get_user_gallery, delete_gallery_image

router = APIRouter(prefix="/gallery", tags=["gallery"])


@router.post("", response_model=GalleryItemResponse)
def save_gallery(payload: GallerySaveRequest, db: Session = Depends(get_db)):
    item = save_gallery_image(
        db,
        user_id=payload.user_id,
        image_url=payload.image_url,
        prompt=payload.prompt,
    )
    return item


@router.get("", response_model=GalleryListResponse)
def read_gallery(user_id: int = Query(...), db: Session = Depends(get_db)):
    items = get_user_gallery(db, user_id)
    return GalleryListResponse(items=items)


@router.delete("/{image_id}")
def delete_gallery(image_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    success = delete_gallery_image(db, image_id=image_id, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")
    return {"success": True, "id": image_id}