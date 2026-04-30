from pydantic import BaseModel
from datetime import datetime


class FavoriteToggleRequest(BaseModel):
    user_id: int


class FavoriteCreateResponse(BaseModel):
    success: bool
    item_id: int
    is_favorite: bool


class FavoriteItemResponse(BaseModel):
    item_id: int
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class FavoriteListResponse(BaseModel):
    items: list[FavoriteItemResponse]