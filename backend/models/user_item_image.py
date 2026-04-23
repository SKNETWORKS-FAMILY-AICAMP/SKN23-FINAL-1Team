# DB 테이블 user_item_image를 python으로 표현한 class

from sqlalchemy import Column, ForeignKey, Integer, TIMESTAMP, Text, func
from sqlalchemy.orm import relationship
from sqlalchemy.types import UserDefinedType

from db.base import Base


class Vector(UserDefinedType):
    cache_ok = True

    def get_col_spec(self, **kw):
        return "vector"


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
    embedding = Column(Vector, nullable=True)
    prompt = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=True)

    user = relationship("User", back_populates="gallery")
