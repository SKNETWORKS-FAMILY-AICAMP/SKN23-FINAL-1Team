from sqlalchemy import BigInteger, Integer, String, Text, Numeric, TIMESTAMP, text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Room(Base):
    __tablename__ = "items"
    __table_args__ = {"schema": "public"}

    item_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    deposit: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default=text("0"))
    rent: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    manage_cost: Mapped[int | None] = mapped_column(Integer, nullable=True)
    service_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    room_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    floor: Mapped[str | None] = mapped_column(String(20), nullable=True)
    all_floors: Mapped[str | None] = mapped_column(String(20), nullable=True)
    area_m2: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    lat: Mapped[float] = mapped_column(Numeric(10, 8), nullable=False)
    lng: Mapped[float] = mapped_column(Numeric(11, 8), nullable=False)
    geohash: Mapped[str | None] = mapped_column(String(20), nullable=True)
    image_thumbnail: Mapped[str | None] = mapped_column(Text, nullable=True)
    first_crawled_at: Mapped[str | None] = mapped_column(TIMESTAMP, nullable=True)
    updated_at: Mapped[str | None] = mapped_column(TIMESTAMP, nullable=True)