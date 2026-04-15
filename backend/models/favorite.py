from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import relationship

from db.base import Base


class Favorite(Base):
    __tablename__ = "favorite"
    __table_args__ = (
        UniqueConstraint("user_id", "item_id", name="unique_user_item"),
        {"schema": "public"},
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.user.user_id", ondelete="CASCADE"), nullable=False)
    item_id = Column(Integer, ForeignKey("public.items.item_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=True)

    user = relationship("User", back_populates="favorites")
    item = relationship("Room", back_populates="favorites")