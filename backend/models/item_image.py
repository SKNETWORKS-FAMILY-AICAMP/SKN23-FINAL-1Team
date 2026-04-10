from datetime import datetime

from sqlalchemy import BigInteger, Boolean, ForeignKey, Integer, Text, TIMESTAMP, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class ItemImage(Base):
    __tablename__ = "item_images"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("public.items.item_id", ondelete="CASCADE"),
        nullable=False,
    )
    s3_url: Mapped[str] = mapped_column(Text, nullable=False)
    is_main: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    created_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP,
        nullable=True,
        server_default=text("now()"),
    )

    room: Mapped["Room"] = relationship("Room", back_populates="images")