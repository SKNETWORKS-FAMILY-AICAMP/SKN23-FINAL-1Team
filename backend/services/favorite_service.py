from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from models.favorite import Favorite
from models.room import Room


def get_user_favorites(db: Session, user_id: int) -> list[Favorite]:
    stmt = (
        select(Favorite)
        .where(Favorite.user_id == user_id)
        .order_by(Favorite.created_at.desc())
    )
    return list(db.scalars(stmt).all())


def is_favorite(db: Session, user_id: int, item_id: int) -> bool:
    stmt = select(Favorite).where(
        Favorite.user_id == user_id,
        Favorite.item_id == item_id,
    )
    return db.scalar(stmt) is not None


def add_favorite(db: Session, user_id: int, item_id: int) -> Favorite:
    room = db.get(Room, item_id)
    if not room:
        raise ValueError("존재하지 않는 매물입니다.")

    existing = db.scalar(
        select(Favorite).where(
            Favorite.user_id == user_id,
            Favorite.item_id == item_id,
        )
    )
    if existing:
        return existing

    favorite = Favorite(user_id=user_id, item_id=item_id)
    db.add(favorite)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        favorite = db.scalar(
            select(Favorite).where(
                Favorite.user_id == user_id,
                Favorite.item_id == item_id,
            )
        )
        if favorite:
            return favorite
        raise
    db.refresh(favorite)
    return favorite


def remove_favorite(db: Session, user_id: int, item_id: int) -> bool:
    stmt = delete(Favorite).where(
        Favorite.user_id == user_id,
        Favorite.item_id == item_id,
    )
    result = db.execute(stmt)
    db.commit()
    return result.rowcount > 0