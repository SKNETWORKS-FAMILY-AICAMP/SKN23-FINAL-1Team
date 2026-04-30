import random
from sqlalchemy.orm import Session
from models.user import User

first_nick = ['배가고픈', '심심한', '달리는', '날아가는', '굴러가는']
second_name = ['메뚜기', '배추', '지렁이', '강아지', '굼벵이']

def generate_random_nickname(db: Session) -> str:
    for _ in range(20):
        nickname = f"{random.choice(first_nick)} {random.choice(second_name)} {random.randint(1000, 9999)}"
        exists = db.query(User).filter(User.nickname == nickname).first()
        if not exists:
            return nickname

    return f"{random.choice(first_nick)} {random.choice(second_name)} {random.randint(1000, 9999)}"


def get_user_by_social(db: Session, social_type: str, provider_id: str):
    return (
        db.query(User)
        .filter(
            User.social_type == social_type,
            User.provider_id == provider_id
        )
        .first()
    )


def create_social_user(
    db: Session,
    *,
    email: str | None,
    social_type: str,
    provider_id: str,
):
    nickname = generate_random_nickname(db)

    user = User(
        email=email,
        nickname=nickname,
        social_type=social_type,
        provider_id=provider_id,
        remain=2,
        credit=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_social_user(
    db: Session,
    *,
    user: User,
    email: str | None,
):
    user.email = email
    db.commit()
    db.refresh(user)
    return user


def get_or_create_social_user(
    db: Session,
    *,
    email: str | None,
    social_type: str,
    provider_id: str,
):
    user = get_user_by_social(db, social_type, provider_id)

    if user:
        user = update_social_user(
            db,
            user=user,
            email=email,
        )
        return user, False

    user = create_social_user(
        db,
        email=email,
        social_type=social_type,
        provider_id=provider_id,
    )
    return user, True
