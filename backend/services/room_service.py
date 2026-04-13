from __future__ import annotations

from sqlalchemy import and_, func, or_, select

from models.room import Room


STRUCTURE_TO_ROOM_TYPE = {
    "open": "오픈형원룸",
    "separated": "분리형원룸",
    "duplex": "복층형원룸",
}

TWO_ROOM_DB_VALUES = [
    "투룸",
]

OPTION_COLUMN_MAP = {
    "aircon": "has_air_con",
    "desk": "has_desk",
    "fridge": "has_fridge",
    "bookshelf": "has_bookcase",
    "washer": "has_washer",
    "bed": "has_bed",
    "gas_stove": "has_gas_stove",
    "induction": "has_induction",
    "shoe_cabinet": "has_shoe_rack",
    "microwave": "has_microwave",
    "sink": "has_sink",
    "closet": "has_closet",
}


def _safe_str(value) -> str:
    return value.strip() if isinstance(value, str) else ""


def _normalize_size_to_m2(size, size_unit: str):
    if size in (None, "", "all"):
        return None

    try:
        numeric_size = float(size)
    except (TypeError, ValueError):
        return None

    if numeric_size <= 0:
        return None

    if size_unit == "pyeong":
        return numeric_size * 3.3058

    return numeric_size


def _apply_search_filter(stmt, req):
    keyword = _safe_str(req.search)
    if not keyword:
        return stmt

    like_keyword = f"%{keyword}%"
    return stmt.where(
        or_(
            Room.address.ilike(like_keyword),
            Room.title.ilike(like_keyword),
        )
    )


def _apply_transaction_filter(stmt, req):
    if req.transaction_type == "monthly":
        return stmt.where(Room.rent > 0)

    if req.transaction_type == "jeonse":
        return stmt.where(Room.rent == 0)

    return stmt


def _apply_room_type_filter(stmt, req):
    if req.room_type == "원룸":
        stmt = stmt.where(Room.room_type.in_(["원룸", "오픈형원룸", "분리형원룸", "복층형원룸"]))
    elif req.room_type == "투룸":
        stmt = stmt.where(Room.room_type.in_(TWO_ROOM_DB_VALUES))

    if req.structure != "all":
        mapped_structure = STRUCTURE_TO_ROOM_TYPE.get(req.structure)
        if mapped_structure:
            stmt = stmt.where(Room.room_type == mapped_structure)

    return stmt


def _apply_price_filter(stmt, req):
    if req.deposit != "all":
      try:
          stmt = stmt.where(Room.deposit <= int(req.deposit))
      except (TypeError, ValueError):
          pass

    if req.monthly_rent != "all" and req.transaction_type != "jeonse":
      try:
          stmt = stmt.where(Room.rent <= int(req.monthly_rent))
      except (TypeError, ValueError):
          pass

    return stmt


def _apply_size_filter(stmt, req):
    size_m2 = _normalize_size_to_m2(req.size, req.size_unit)
    if size_m2 is None:
        return stmt

    return stmt.where(Room.area_m2 <= size_m2)


def _apply_bounds_filter(stmt, req):
    if None in (req.sw_lat, req.sw_lng, req.ne_lat, req.ne_lng):
        return stmt

    min_lat = min(req.sw_lat, req.ne_lat)
    max_lat = max(req.sw_lat, req.ne_lat)
    min_lng = min(req.sw_lng, req.ne_lng)
    max_lng = max(req.sw_lng, req.ne_lng)

    return stmt.where(
        and_(
            Room.lat >= min_lat,
            Room.lat <= max_lat,
            Room.lng >= min_lng,
            Room.lng <= max_lng,
        )
    )


def _apply_option_filter(stmt, req):
    for option in req.options:
        column_name = OPTION_COLUMN_MAP.get(option)
        if not column_name:
            continue

        column = getattr(Room, column_name, None)
        if column is None:
            continue

        stmt = stmt.where(column.is_(True))

    return stmt


def _apply_common_filters(stmt, req):
    stmt = _apply_search_filter(stmt, req)
    stmt = _apply_transaction_filter(stmt, req)
    stmt = _apply_room_type_filter(stmt, req)
    stmt = _apply_price_filter(stmt, req)
    stmt = _apply_size_filter(stmt, req)
    stmt = _apply_bounds_filter(stmt, req)
    stmt = _apply_option_filter(stmt, req)
    return stmt


def _serialize_room(room: Room) -> dict:
    return {
        "item_id": room.item_id,
        "status": room.status,
        "title": room.title,
        "url": room.url,
        "address": room.address,
        "deposit": room.deposit,
        "rent": room.rent,
        "manage_cost": room.manage_cost,
        "service_type": room.service_type,
        "room_type": room.room_type,
        "floor": room.floor,
        "all_floors": room.all_floors,
        "area_m2": float(room.area_m2) if room.area_m2 is not None else None,
        "lat": float(room.lat),
        "lng": float(room.lng),
        "geohash": room.geohash,
        "image_thumbnail": room.image_thumbnail,
    }


def search_rooms(db, req):
    stmt = select(Room)
    count_stmt = select(func.count()).select_from(Room)

    stmt = _apply_common_filters(stmt, req)
    count_stmt = _apply_common_filters(count_stmt, req)

    stmt = stmt.order_by(Room.updated_at.desc(), Room.item_id.desc())
    stmt = stmt.offset(req.offset).limit(req.limit)

    items = db.execute(stmt).scalars().all()
    total = db.execute(count_stmt).scalar_one()

    serialized = [_serialize_room(room) for room in items]

    return {
        "items": serialized,
        "total": total,
        "offset": req.offset,
        "limit": req.limit,
        "has_more": req.offset + req.limit < total,
    }


def search_rooms_for_map(db, req):
    stmt = select(Room)
    stmt = _apply_common_filters(stmt, req)
    stmt = stmt.order_by(Room.updated_at.desc(), Room.item_id.desc())

    items = db.execute(stmt).scalars().all()
    serialized = [_serialize_room(room) for room in items]

    total = len(serialized)

    return {
        "items": serialized,
        "total": total,
        "offset": 0,
        "limit": total,
        "has_more": False,
    }