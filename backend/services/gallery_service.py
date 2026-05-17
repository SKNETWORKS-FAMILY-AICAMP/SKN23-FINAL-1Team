import json
import os
from urllib.parse import unquote, urlparse

from sqlalchemy.orm import Session
from models.user_item_image import UserItemImage
from datetime import datetime, timedelta, timezone


def _serialize_embedding(embedding: list[float] | None) -> str | None:
    if embedding is None:
        return None
    return json.dumps(embedding)


def _get_image_filename(image_url: str) -> str | None:
    path = urlparse(image_url).path or image_url
    filename = os.path.basename(unquote(path))
    return filename or None


def save_gallery_image(db: Session, user_id: int, image_url: str, embedding: list[float] | None = None, prompt: str | None = None):
    """
    이미지 경로와 함께 "임베딩 벡터"도 같이 저장.
    """
    gallery_item = UserItemImage(
        user_id=user_id,
        image_url=image_url,
        embedding=_serialize_embedding(embedding),
        prompt=prompt,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(gallery_item)
    db.commit()
    db.refresh(gallery_item)
    return gallery_item


def save_or_update_gallery_embedding(
    db: Session,
    user_id: int,
    image_url: str,
    embedding: list[float],
    gallery_image_id: int | None = None,
):
    serialized_embedding = _serialize_embedding(embedding)
    gallery_item = None

    if gallery_image_id is not None:
        gallery_item = (
            db.query(UserItemImage)
            .filter(
                UserItemImage.id == gallery_image_id,
                UserItemImage.user_id == user_id,
            )
            .first()
        )

    if gallery_item is None:
        gallery_item = (
            db.query(UserItemImage)
            .filter(UserItemImage.user_id == user_id, UserItemImage.image_url == image_url)
            .order_by(UserItemImage.created_at.desc(), UserItemImage.id.desc())
            .first()
        )

    filename = _get_image_filename(image_url)
    if gallery_item is None and filename is not None:
        gallery_item = (
            db.query(UserItemImage)
            .filter(
                UserItemImage.user_id == user_id,
                UserItemImage.image_url.contains(filename),
            )
            .order_by(UserItemImage.created_at.desc(), UserItemImage.id.desc())
            .first()
        )

    if gallery_item is None:
        gallery_item = UserItemImage(
            user_id=user_id,
            image_url=image_url,
            embedding=serialized_embedding,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db.add(gallery_item)
    else:
        gallery_item.embedding = serialized_embedding

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
