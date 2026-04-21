from sqlalchemy.orm import Session
from models.user_item_image import UserItemImage
# from services.embedding_service import generate_embedding  # 임베딩 보류


def save_gallery_image(db: Session, user_id: int, image_url: str, prompt: str | None = None):
    
    # embedding = generate_embedding(image_url)  # 임베딩 보류
    
    gallery_item = UserItemImage(
        user_id=user_id,
        image_url=image_url,
        # embedding=embedding,  # 임베딩 보류
        prompt=prompt,
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