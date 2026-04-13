from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class ItemFeatures(Base):
    __tablename__ = "item_features"
    __table_args__ = {"schema": "public"}

    item_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("public.items.item_id", ondelete="CASCADE"),
        primary_key=True,
    )

    has_parking: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    parking_count: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True, default=0.0)
    has_elevator: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    bathroom_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    residence_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    room_direction: Mapped[str | None] = mapped_column(String(20), nullable=True)
    movein_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    approve_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    has_air_con: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    has_fridge: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    has_washer: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    has_gas_stove: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    has_induction: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    has_microwave: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    has_desk: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    has_bed: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    has_closet: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    has_shoe_rack: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)

    dist_subway: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dist_pharmacy: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dist_conv: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dist_bus: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dist_mart: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dist_laundry: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dist_cafe: Mapped[int | None] = mapped_column(Integer, nullable=True)

    is_coupang: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    is_ssg: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    is_marketkurly: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    is_baemin: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    is_yogiyo: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)

    is_subway_area: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    is_convenient_area: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    is_park_area: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    is_school_area: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)

    options_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    amenities_raw: Mapped[str | None] = mapped_column(Text, nullable=True)

    has_bookcase: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    has_sink: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)

    room: Mapped["Room"] = relationship(
        "Room",
        back_populates="features",
        uselist=False,
    )