from pydantic import BaseModel


class RoomFeatureResponse(BaseModel):
    has_parking: bool | None = None
    parking_count: float | None = None
    has_elevator: bool | None = None
    bathroom_count: int | None = None
    residence_type: str | None = None
    room_direction: str | None = None
    movein_date: str | None = None
    approve_date: str | None = None

    has_air_con: bool | None = None
    has_fridge: bool | None = None
    has_washer: bool | None = None
    has_gas_stove: bool | None = None
    has_induction: bool | None = None
    has_microwave: bool | None = None
    has_desk: bool | None = None
    has_bed: bool | None = None
    has_closet: bool | None = None
    has_shoe_rack: bool | None = None
    has_bookcase: bool | None = None
    has_sink: bool | None = None

    dist_subway: int | None = None
    dist_pharmacy: int | None = None
    dist_conv: int | None = None
    dist_bus: int | None = None
    dist_mart: int | None = None
    dist_laundry: int | None = None
    dist_cafe: int | None = None

    is_coupang: bool | None = None
    is_ssg: bool | None = None
    is_marketkurly: bool | None = None
    is_baemin: bool | None = None
    is_yogiyo: bool | None = None

    is_subway_area: bool | None = None
    is_convenient_area: bool | None = None
    is_park_area: bool | None = None
    is_school_area: bool | None = None

    options_raw: str | None = None
    amenities_raw: str | None = None


class RoomImageResponse(BaseModel):
    id: int
    url: str
    is_main: bool | None = None

    model_config = {"from_attributes": True}


class RoomDetailItemResponse(BaseModel):
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


class RoomDetailResponse(BaseModel):
    item: RoomDetailItemResponse
    features: RoomFeatureResponse | None = None
    images: list[RoomImageResponse] = []