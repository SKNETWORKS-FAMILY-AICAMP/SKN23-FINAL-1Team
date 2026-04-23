from sqlalchemy.orm import Session
from models.user_item_image import UserItemImage
from datetime import datetime, timedelta, timezone

# from services.embedding_service import generate_embedding  # 임베딩 보류


def save_gallery_image(db: Session, user_id: int, image_url: str, prompt: str | None = None):
    # embedding = generate_embedding(image_url)  # 임베딩 보류

    gallery_item = UserItemImage(
        user_id=user_id,
        image_url=image_url,
        # embedding=embedding,  # 임베딩 보류
        prompt=prompt,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(gallery_item)
    db.commit()
    db.refresh(gallery_item)
    return gallery_item


def get_user_gallery(db: Session, user_id: int):
    return (
        db.query(UserItemImage)
        .filter(UserItemImage.user_id == user_id)
        .order_by(UserItemImage.created_at.desc())
        .all()
    )


def delete_gallery_image(db: Session, image_id: int, user_id: int):
    item = (
        db.query(UserItemImage)
        .filter(UserItemImage.id == image_id, UserItemImage.user_id == user_id)
        .first()
    )
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True
