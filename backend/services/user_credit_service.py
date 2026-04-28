from sqlalchemy.orm import Session

from models.user import User


def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.user_id == user_id).first()


def increment_user_credit(db: Session, user_id: int):
    user = get_user_by_id(db, user_id)

    if user is None:
        return None

    user.credit += 1
    db.commit()
    db.refresh(user)
    return user


def decrement_user_remain(db: Session, user_id: int):
    user = get_user_by_id(db, user_id)

    if user is None:
        return None

    if user.remain <= 0:
        return False

    user.remain -= 1
    db.commit()
    db.refresh(user)
    return user
