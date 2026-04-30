from sqlalchemy import Column, Integer, Text, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from db.base import Base
from datetime import datetime, timedelta


class UserItemImage(Base):
    __tablename__ = "user_item_image"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("public.user.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    image_url = Column(Text, nullable=False)
    embedding = Column(Text, nullable=True)
    prompt = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=True)
    expires_at = Column(TIMESTAMP, nullable=True)

    user = relationship("User", back_populates="gallery")
