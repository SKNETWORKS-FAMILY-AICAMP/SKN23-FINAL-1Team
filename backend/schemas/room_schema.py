from pydantic import BaseModel, Field
from typing import Literal


class RoomListRequest(BaseModel):
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)

    search: str = ""
    transaction_type: Literal["all", "monthly", "jeonse"] = "all"
    room_type: Literal["all", "원룸", "투룸"] = "all"
    structure: Literal["all", "open", "separated", "duplex"] = "all"

    deposit: int | Literal["all"] = "all"
    monthly_rent: int | Literal["all"] = "all"

    size: float | Literal["all"] = "all"
    size_unit: Literal["m2", "pyeong"] = "m2"

    options: list[str] = []


class RoomItemResponse(BaseModel):
    item_id: int
    status: str
    title: str | None = None
    url: str | None = None
    address: str
    deposit: int
    rent: int
    manage_cost: int | None = None
    service_type: str | None = None
    room_type: str | None = None
    floor: str | None = None
    all_floors: str | None = None
    area_m2: float | None = None
    lat: float
    lng: float
    geohash: str | None = None
    image_thumbnail: str | None = None

    model_config = {"from_attributes": True}


class RoomListResponse(BaseModel):
    items: list[RoomItemResponse]
    total: int
    offset: int
    limit: int
    has_more: bool