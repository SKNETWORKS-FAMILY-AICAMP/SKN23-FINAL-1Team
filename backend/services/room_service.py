from sqlalchemy import Integer, cast, column, distinct, func, not_, or_, select, table, text
from sqlalchemy.orm import Session
from models.item_image import ItemImage
from models.room import Room

STRUCTURE_TO_ROOM_TYPE = {
    "open": "오픈형원룸",
    "separated": "분리형원룸",
    "duplex": "복층형원룸",
}

TWO_ROOM_DB_VALUES = [
    "투룸",
]

MAX_ZOOM_MARKER_LEVEL = 1

ITEM_IMAGE_EMBEDDINGS = table(
    "item_image_embeddings",
    column("image_id", Integer),
    column("embedding"),
    schema="public",
)


def is_valid_image_value(value) -> bool:
    if value is None:
        return False

    if not isinstance(value, str):
        return False

    normalized = value.strip()
    lowered = normalized.lower()

    if lowered in {"", "nan", "none", "null"}:
        return False

    return (
        normalized.startswith("http://")
        or normalized.startswith("https://")
        or normalized.startswith("/")
        or normalized.startswith("s3://")
    )


def format_korean_money(value: int | None) -> str:
    safe_value = int(value or 0)
    if safe_value >= 10000:
        eok = safe_value // 10000
        rest = safe_value % 10000
        return f"{eok}억" if rest == 0 else f"{eok}억 {rest}만"
    return f"{safe_value}만"


def format_price(deposit: int | None, rent: int | None) -> str:
    safe_deposit = int(deposit or 0)
    safe_rent = int(rent or 0)

    if safe_rent <= 0:
        return f"전세 {format_korean_money(safe_deposit)}"

    return f"{format_korean_money(safe_deposit)} / {safe_rent}만"


def format_size(area_m2) -> str:
    if area_m2 is None:
        return "-"
    return f"{float(area_m2):.1f}m²"


def get_grid_size_by_level(level: int | None) -> float:
    safe_level = int(level or 4)

    # level 숫자가 작을수록 확대, 클수록 축소
    # 따라서 축소될수록 grid는 더 커져야 함
    if safe_level == 2:
        return 0.002
    if safe_level == 3:
        return 0.004
    if safe_level == 4:
        return 0.008
    if safe_level == 5:
        return 0.015
    return 0.025


def normalize_structures(structure) -> list[str]:
    if structure == "all" or structure is None:
        return []

    if isinstance(structure, str):
        return [structure]

    return [value for value in structure if value != "all"]


def get_floor_number_expression():
    return cast(
        func.nullif(func.substring(Room.floor, "[-]?[0-9]+"), ""),
        Integer,
    )


def get_basement_condition():
    return or_(
        Room.floor.ilike("%반지하%"),
        Room.floor.ilike("%지하%"),
        Room.floor.ilike("%b%"),
        Room.floor.like("-%"),
    )


def apply_room_filters(stmt, req):
    stmt = stmt.where(Room.status == "ACTIVE")

    if req.search.strip():
        keyword = f"%{req.search.strip()}%"
        stmt = stmt.where(
            or_(
                Room.address.ilike(keyword),
                Room.title.ilike(keyword),
            )
        )

    if req.transaction_type == "monthly":
        stmt = stmt.where(Room.rent > 0)
    elif req.transaction_type == "jeonse":
        stmt = stmt.where(Room.rent == 0)

    if req.room_type == "원룸":
        stmt = stmt.where(Room.room_type.like("%원룸%"))
    elif req.room_type == "투룸":
        stmt = stmt.where(Room.room_type.in_(TWO_ROOM_DB_VALUES))

    structures = normalize_structures(req.structure)
    if structures and req.room_type == "원룸":
        mapped_room_types = [
            STRUCTURE_TO_ROOM_TYPE[structure]
            for structure in structures
            if structure in STRUCTURE_TO_ROOM_TYPE
        ]
        if mapped_room_types:
            stmt = stmt.where(Room.room_type.in_(mapped_room_types))

    if req.deposit != "all":
        stmt = stmt.where(Room.deposit <= int(req.deposit))

    if req.monthly_rent != "all":
        stmt = stmt.where(Room.rent <= int(req.monthly_rent))

    if req.size != "all":
        size_value = float(req.size)
        if req.size_unit == "pyeong":
            size_value = size_value * 3.3058
        stmt = stmt.where(Room.area_m2 <= size_value)

    if req.floor != "all":
        basement_condition = get_basement_condition()

        if req.floor == "semi-basement":
            stmt = stmt.where(basement_condition)
        else:
            floor_number = get_floor_number_expression()
            stmt = stmt.where(Room.floor.isnot(None), not_(basement_condition))

            if req.floor == "4plus":
                stmt = stmt.where(floor_number >= 4)
            else:
                stmt = stmt.where(floor_number == int(req.floor))

    if req.sw_lat is not None and req.ne_lat is not None:
        stmt = stmt.where(Room.lat >= req.sw_lat, Room.lat <= req.ne_lat)

    if req.sw_lng is not None and req.ne_lng is not None:
        stmt = stmt.where(Room.lng >= req.sw_lng, Room.lng <= req.ne_lng)

    return stmt


def serialize_room_marker(room):
    image_urls = [room.image_thumbnail] if is_valid_image_value(room.image_thumbnail) else []

    return {
        "type": "marker",
        "id": str(room.item_id),
        "item_id": room.item_id,
        "title": room.title or "제목 없는 매물",
        "price": format_price(room.deposit, room.rent),
        "deposit": format_korean_money(room.deposit),
        "monthlyRent": str(int(room.rent or 0)),
        "address": room.address,
        "size": format_size(room.area_m2),
        "floor": room.floor or "-",
        "images": image_urls,
        "lat": float(room.lat),
        "lng": float(room.lng),
        "structure": room.room_type or "매물",
        "options": [],
    }


def get_rooms(db, req):
    stmt = select(Room)
    count_stmt = select(func.count()).select_from(Room)

    stmt = apply_room_filters(stmt, req)
    count_stmt = apply_room_filters(count_stmt, req)

    total = db.execute(count_stmt).scalar_one()
    rows = db.execute(
        stmt.order_by(Room.updated_at.desc().nullslast(), Room.item_id.desc())
        .offset(req.offset)
        .limit(req.limit)
    ).scalars().all()

    return {
        "items": rows,
        "total": total,
        "has_more": req.offset + req.limit < total,
    }


def get_rooms_by_similarity(db: Session, req, embedding: list[float] | None = None):
    """
    기존 get_rooms 기능을 그대로 쓰되,
    중복 없이 '가장 비슷한 이미지가 있는 방' 순서로 정렬함.
    """
    stmt = select(Room)
    count_stmt = select(func.count(distinct(Room.item_id)))

    if embedding:
        vector_str = "[" + ",".join(map(str, embedding)) + "]"

        # 조인: Room -> ItemImage -> item_image_embeddings
        stmt = stmt.join(ItemImage, Room.item_id == ItemImage.item_id)
        stmt = stmt.join(ITEM_IMAGE_EMBEDDINGS, ItemImage.id == ITEM_IMAGE_EMBEDDINGS.c.image_id)
        count_stmt = count_stmt.join(ItemImage, Room.item_id == ItemImage.item_id)
        count_stmt = count_stmt.join(
            ITEM_IMAGE_EMBEDDINGS,
            ItemImage.id == ITEM_IMAGE_EMBEDDINGS.c.image_id,
        )

        similarity_expr = func.min(
            ITEM_IMAGE_EMBEDDINGS.c.embedding.op("<#>")(text(f"'{vector_str}'::vector"))
        )

        stmt = apply_room_filters(stmt, req)
        count_stmt = apply_room_filters(count_stmt, req)

        stmt = stmt.group_by(Room.item_id).order_by(similarity_expr)
    else:
        stmt = apply_room_filters(stmt, req)
        count_stmt = apply_room_filters(count_stmt, req)
        stmt = stmt.order_by(Room.updated_at.desc().nullslast(), Room.item_id.desc())

    total = db.execute(count_stmt).scalar_one()

    rows = db.execute(
        stmt.offset(req.offset).limit(req.limit)
    ).scalars().all()

    return {
        "items": [serialize_room_marker(r) for r in rows],
        "total": total,
        "has_more": req.offset + req.limit < total,
    }


def get_map_items(db, req):
    base_stmt = select(Room)
    base_stmt = apply_room_filters(base_stmt, req)

    level = int(req.level or 4)
    print(f"[get_map_items] level={level}")

    # level 2 이상이면 무조건 클러스터
    if level >= 2:
        grid_size = get_grid_size_by_level(level)

        lat_bucket = cast(func.floor(Room.lat / grid_size), Integer)
        lng_bucket = cast(func.floor(Room.lng / grid_size), Integer)

        cluster_stmt = (
            select(
                lat_bucket.label("lat_bucket"),
                lng_bucket.label("lng_bucket"),
                func.avg(Room.lat).label("lat"),
                func.avg(Room.lng).label("lng"),
                func.count(Room.item_id).label("count"),
            )
            .select_from(Room)
        )

        cluster_stmt = apply_room_filters(cluster_stmt, req)
        cluster_stmt = (
            cluster_stmt.group_by(lat_bucket, lng_bucket)
            .order_by(func.count(Room.item_id).desc())
            .limit(500)
        )

        rows = db.execute(cluster_stmt).all()

        items = [
            {
                "type": "cluster",
                "id": f"{row.lat_bucket}_{row.lng_bucket}",
                "lat": float(row.lat),
                "lng": float(row.lng),
                "count": int(row.count),
            }
            for row in rows
        ]

        return {
            "mode": "cluster",
            "items": items,
        }

    # level 1일 때만 개별 마커
    rows = db.execute(
        base_stmt.order_by(
            Room.updated_at.desc().nullslast(),
            Room.item_id.desc(),
        ).limit(1000)
    ).scalars().all()

    return {
        "mode": "marker",
        "items": [serialize_room_marker(room) for room in rows],
    }
