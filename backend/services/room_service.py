from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from models.room import Room
from schemas.room_schema import RoomListRequest

STRUCTURE_TO_ROOM_TYPE = {
    "open": "오픈형원룸",
    "separated": "분리형원룸",
    "duplex": "복층형원룸",
}

TWO_ROOM_DB_VALUES = [
    "투룸",
]

def get_rooms(db, req):
    print("[get_rooms] request payload:", req.model_dump())
    stmt = select(Room)
    count_stmt = select(func.count()).select_from(Room)

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

    # 원룸/투룸 기본 필터
    if req.room_type == "원룸":
        if req.structure == "all":
            stmt = stmt.where(Room.room_type.in_([
                "오픈형원룸",
                "분리형원룸",
                "복층형원룸",
            ]))
            count_stmt = count_stmt.where(Room.room_type.in_([
                "오픈형원룸",
                "분리형원룸",
                "복층형원룸",
            ]))
        else:
            db_room_type = STRUCTURE_TO_ROOM_TYPE.get(req.structure)
            if db_room_type:
                stmt = stmt.where(Room.room_type == db_room_type)
                count_stmt = count_stmt.where(Room.room_type == db_room_type)

    elif req.room_type == "투룸":
        if req.structure == "all":
            stmt = stmt.where(Room.room_type.in_(TWO_ROOM_DB_VALUES))
            count_stmt = count_stmt.where(Room.room_type.in_(TWO_ROOM_DB_VALUES))
        else:
            # 필요하면 투룸 구조도 별도 매핑
            pass
    
    
    
    stmt = stmt.order_by(Room.updated_at.desc(), Room.item_id.desc()).offset(req.offset).limit(req.limit)
    rooms = db.execute(stmt).scalars().all()
    total = db.execute(count_stmt).scalar() or 0

    return {
        "items": rooms,
        "total": total,
        "offset": req.offset,
        "limit": req.limit,
        "has_more": req.offset + req.limit < total,
    }