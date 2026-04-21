from pydantic import BaseModel
from datetime import datetime


class GallerySaveRequest(BaseModel):
    user_id: int
    image_url: str
    prompt: str | None = None


class GalleryItemResponse(BaseModel):
    id: int
    image_url: str
    prompt: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class GalleryListResponse(BaseModel):
    items: list[GalleryItemResponse]
