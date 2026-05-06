from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.orm import Session

from db.session import get_db
from schemas.room_schema import RoomListRequest
from services.room_service import get_rooms, get_map_items

router = APIRouter(prefix="/rooms", tags=["rooms"])


def build_room_list_request(
    offset: int = Query(0),
    limit: int = Query(20),
    search: str = Query(""),
    transaction_type: str = Query("all"),
    room_type: str = Query("all"),
    structure: str | list[str] = Query("all"),
    deposit: int | str = Query("all"),
    monthly_rent: int | str = Query("all"),
    size: int | float | str = Query("all"),
    size_unit: str = Query("m2"),
    floor: str = Query("all"),
    options: list[str] = Query(default_factory=list),
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    sw_lat: float | None = Query(None),
    sw_lng: float | None = Query(None),
    ne_lat: float | None = Query(None),
    ne_lng: float | None = Query(None),
    level: int | None = Query(None),
    sort: str = Query("latest"),
    exclude_item_id: int | None = Query(None),
) -> RoomListRequest:
    return RoomListRequest(
        offset=offset,
        limit=limit,
        search=search,
        transaction_type=transaction_type,
        room_type=room_type,
        structure=structure,
        deposit=deposit,
        monthly_rent=monthly_rent,
        size=size,
        size_unit=size_unit,
        floor=floor,
        options=options,
        lat=lat,
        lng=lng,
        sw_lat=sw_lat,
        sw_lng=sw_lng,
        ne_lat=ne_lat,
        ne_lng=ne_lng,
        level=level,
        sort=sort,
        exclude_item_id=exclude_item_id,
    )


@router.post("/search")
def search_rooms(req: RoomListRequest = Body(...), db: Session = Depends(get_db)):
    return get_rooms(db, req)


@router.get("/search")
def search_rooms_by_query(
    req: RoomListRequest = Depends(build_room_list_request),
    db: Session = Depends(get_db),
):
    return get_rooms(db, req)


@router.post("/map-search")
def search_map_rooms(req: RoomListRequest = Body(...), db: Session = Depends(get_db)):
    return get_map_items(db, req)


@router.get("/map-search")
def search_map_rooms_by_query(
    req: RoomListRequest = Depends(build_room_list_request),
    db: Session = Depends(get_db),
):
    return get_map_items(db, req)
