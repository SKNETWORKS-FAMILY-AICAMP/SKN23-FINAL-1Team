from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from db.session import get_db
from schemas.gallery_schema import GallerySaveRequest, GalleryItemResponse, GalleryListResponse
from services.gallery_service import save_gallery_image, get_user_gallery

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
