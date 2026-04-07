from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from models.room import Room
from schemas.room_schema import RoomListRequest


def get_rooms(db: Session, req: RoomListRequest):
    stmt = select(Room).where(Room.status == "active")
    count_stmt = select(func.count()).select_from(Room).where(Room.status == "active")

    if req.search.strip():
        keyword = f"%{req.search.strip()}%"
        search_condition = or_(
            Room.address.ilike(keyword),
            Room.title.ilike(keyword),
        )
        stmt = stmt.where(search_condition)
        count_stmt = count_stmt.where(search_condition)

    if req.transaction_type == "monthly":
        stmt = stmt.where(Room.rent > 0)
        count_stmt = count_stmt.where(Room.rent > 0)
    elif req.transaction_type == "jeonse":
        stmt = stmt.where(Room.rent == 0)
        count_stmt = count_stmt.where(Room.rent == 0)

    if req.room_type != "all":
        stmt = stmt.where(Room.room_type == req.room_type)
        count_stmt = count_stmt.where(Room.room_type == req.room_type)

    total = db.scalar(count_stmt) or 0

    stmt = (
        stmt.order_by(Room.updated_at.desc().nullslast(), Room.item_id.desc())
        .offset(req.offset)
        .limit(req.limit)
    )

    items = db.scalars(stmt).all()

    return {
        "items": items,
        "total": total,
        "offset": req.offset,
        "limit": req.limit,
        "has_more": req.offset + req.limit < total,
    }