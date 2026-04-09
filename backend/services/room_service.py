from sqlalchemy import select, func, or_
# from sqlalchemy.orm import Session
from models.item_features import ItemFeature
from models.room import Room
# from schemas.room_schema import RoomListRequest

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


def get_rooms(db, req):
    print("[get_rooms] request payload:", req.model_dump())

    stmt = (
        select(Room)
        .outerjoin(ItemFeature, ItemFeature.item_id == Room.item_id)
        .where(Room.status == "ACTIVE")
    )

    count_stmt = (
        select(func.count(func.distinct(Room.item_id)))
        .select_from(Room)
        .outerjoin(ItemFeature, ItemFeature.item_id == Room.item_id)
        .where(Room.status == "ACTIVE")
    )

    if req.search.strip():
        keyword = f"%{req.search.strip()}%"
        condition = or_(
            Room.address.ilike(keyword),
            Room.title.ilike(keyword),
        )
        stmt = stmt.where(condition)
        count_stmt = count_stmt.where(condition)

    if req.transaction_type == "monthly":
        stmt = stmt.where(Room.rent > 0)
        count_stmt = count_stmt.where(Room.rent > 0)
    elif req.transaction_type == "jeonse":
        stmt = stmt.where(Room.rent == 0)
        count_stmt = count_stmt.where(Room.rent == 0)

    if req.room_type == "원룸":
        if req.structure == "all":
            condition = Room.room_type.in_([
                "오픈형원룸",
                "분리형원룸",
                "복층형원룸",
            ])
            stmt = stmt.where(condition)
            count_stmt = count_stmt.where(condition)
        else:
            db_room_type = STRUCTURE_TO_ROOM_TYPE.get(req.structure)
            if db_room_type:
                condition = Room.room_type == db_room_type
                stmt = stmt.where(condition)
                count_stmt = count_stmt.where(condition)

    elif req.room_type == "투룸":
        condition = Room.room_type.in_(TWO_ROOM_DB_VALUES)
        stmt = stmt.where(condition)
        count_stmt = count_stmt.where(condition)

    if req.price != "all":
        price_value = int(req.price)

        if req.transaction_type == "jeonse":
            condition = Room.deposit <= price_value * 10000
        else:
            condition = Room.rent <= price_value

        stmt = stmt.where(condition)
        count_stmt = count_stmt.where(condition)

    if req.size != "all":
        size_value = float(req.size)
        size_m2 = size_value if req.size_unit == "m2" else size_value * 3.3058

        condition = Room.area_m2 <= size_m2
        stmt = stmt.where(condition)
        count_stmt = count_stmt.where(condition)

    if req.options:
        option_conditions = []

        for option in req.options:
            column_name = OPTION_COLUMN_MAP.get(option)
            if not column_name:
                continue

            option_column = getattr(ItemFeature, column_name, None)
            if option_column is not None:
                option_conditions.append(option_column.is_(True))

        if option_conditions:
            stmt = stmt.where(and_(*option_conditions))
            count_stmt = count_stmt.where(and_(*option_conditions))

    stmt = (
        stmt.distinct(Room.item_id)
        .order_by(Room.updated_at.desc(), Room.item_id.desc())
        .offset(req.offset)
        .limit(req.limit)
    )

    rooms = db.execute(stmt).scalars().all()
    total = db.execute(count_stmt).scalar() or 0

    return {
        "items": rooms,
        "total": total,
        "offset": req.offset,
        "limit": req.limit,
        "has_more": req.offset + req.limit < total,
    }