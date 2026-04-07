from pydantic import BaseModel, ConfigDict
from typing import Optional


class RoomListRequest(BaseModel):
    offset: int = 0
    limit: int = 20
    search: str = ""
    transaction_type: str = "all"
    room_type: str = "all"
    structure: str = "all"


class RoomResponse(BaseModel):
    item_id: int
    title: Optional[str] = None
    address: str
    deposit: int
    rent: int
    manage_cost: Optional[int] = None
    service_type: Optional[str] = None
    room_type: Optional[str] = None
    floor: Optional[str] = None
    all_floors: Optional[str] = None
    area_m2: Optional[float] = None
    lat: float
    lng: float
    image_thumbnail: Optional[str] = None
    url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RoomListResponse(BaseModel):
    items: list[RoomResponse]
    total: int
    offset: int
    limit: int
    has_more: bool