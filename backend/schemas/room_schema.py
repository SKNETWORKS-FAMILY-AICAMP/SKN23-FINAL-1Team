from typing import Literal

from pydantic import BaseModel, Field


TransactionType = Literal["all", "monthly", "jeonse"]
RoomTypeLiteral = Literal["원룸", "투룸", "all"]
StructureLiteral = Literal["all", "open", "separated", "duplex"]
StructureFilter = StructureLiteral | list[StructureLiteral]
SizeUnitLiteral = Literal["m2", "pyeong"]
FloorFilterLiteral = Literal["all", "semi-basement", "1", "2", "3", "4plus"]


class RoomSearchRequest(BaseModel):
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=200)

    search: str = ""
    transaction_type: TransactionType = "all"
    room_type: RoomTypeLiteral = "all"
    structure: StructureFilter = "all"

    deposit: int | str = "all"
    monthly_rent: int | str = "all"
    size: float | str = "all"
    size_unit: SizeUnitLiteral = "m2"
    floor: FloorFilterLiteral = "all"
    options: list[str] = Field(default_factory=list)

    lat: float | None = None
    lng: float | None = None
    sw_lat: float | None = None
    sw_lng: float | None = None
    ne_lat: float | None = None
    ne_lng: float | None = None


class RoomMapSearchRequest(BaseModel):
    search: str = ""
    transaction_type: TransactionType = "all"
    room_type: RoomTypeLiteral = "all"
    structure: StructureFilter = "all"

    deposit: int | str = "all"
    monthly_rent: int | str = "all"
    size: float | str = "all"
    size_unit: SizeUnitLiteral = "m2"
    floor: FloorFilterLiteral = "all"
    options: list[str] = Field(default_factory=list)

    lat: float | None = None
    lng: float | None = None
    sw_lat: float | None = None
    sw_lng: float | None = None
    ne_lat: float | None = None
    ne_lng: float | None = None


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

    class Config:
        from_attributes = True


class RoomListResponse(BaseModel):
    items: list[RoomItemResponse]
    total: int
    offset: int
    limit: int
    has_more: bool
    
class RoomListRequest(BaseModel):
    offset: int = 0
    limit: int = 20
    search: str = ""
    transaction_type: str = "all"
    room_type: str = "all"
    structure: str | list[str] = "all"
    deposit: int | str = "all"
    monthly_rent: int | str = "all"
    size: int | float | str = "all"
    size_unit: Literal["m2", "pyeong"] = "m2"
    floor: FloorFilterLiteral = "all"
    options: list[str] = []
    lat: float | None = None
    lng: float | None = None
    sw_lat: float | None = None
    sw_lng: float | None = None
    ne_lat: float | None = None
    ne_lng: float | None = None
    level: int | None = None
