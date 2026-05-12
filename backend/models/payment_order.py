from sqlalchemy import BigInteger, Column, DateTime, Integer, String, func

from db.base import Base


class PaymentOrder(Base):
    __tablename__ = "payment_order"
    __table_args__ = {"schema": "public"}

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    payment_id = Column(String(100), unique=True, nullable=False, index=True)
    user_id = Column(BigInteger, nullable=False, index=True)
    item_name = Column(String(100), nullable=False)
    amount = Column(Integer, nullable=False)
    credit_amount = Column(Integer, nullable=False)
    payment_sdk = Column(String(10), nullable=True)
    payment_channel = Column(String(30), nullable=True)
    provider_transaction_id = Column(String(100), nullable=True, index=True)
    status = Column(String(20), nullable=False, default="READY")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    paid_at = Column(DateTime(timezone=True), nullable=True)
