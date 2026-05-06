from sqlalchemy import BigInteger, String, TIMESTAMP, ForeignKey, text
from db.base import Base
from sqlalchemy.orm import Mapped, mapped_column


class Broker(Base):
    __tablename__ = "brokers"
    __table_args__ = {"schema": "public"}

    broker_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("public.user.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    office_name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[str | None] = mapped_column(
        TIMESTAMP,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
    )
