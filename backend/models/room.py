from sqlalchemy import BigInteger, Boolean, Float, ForeignKey, Integer, Numeric, String, Text, TIMESTAMP, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UserDefinedType
from models.item_features import ItemFeatures
from models.item_image import ItemImage
from db.base import Base


class GeographyPoint(UserDefinedType):
    cache_ok = True

    def get_col_spec(self, **kw):
        return "geography(point, 4326)"


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
    geom: Mapped[object | None] = mapped_column(GeographyPoint(), nullable=True)
    geohash: Mapped[str | None] = mapped_column(String(20), nullable=True)
    image_thumbnail: Mapped[str | None] = mapped_column(Text, nullable=True)
    first_crawled_at: Mapped[str | None] = mapped_column(TIMESTAMP, nullable=True, server_default=text("now()"))
    updated_at: Mapped[str | None] = mapped_column(TIMESTAMP, nullable=True, server_default=text("now()"))
    broker_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("public.user.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    recommendation_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_embedded: Mapped[bool | None] = mapped_column(Boolean, nullable=True, server_default=text("false"))

    features: Mapped["ItemFeatures | None"] = relationship(
        "ItemFeatures",
        back_populates="room",
        uselist=False,
        cascade="all, delete-orphan",
    )
    images: Mapped[list["ItemImage"]] = relationship(
        "ItemImage",
        back_populates="room",
        cascade="all, delete-orphan",
    )
    favorites = relationship("Favorite", back_populates="item", cascade="all, delete-orphan")