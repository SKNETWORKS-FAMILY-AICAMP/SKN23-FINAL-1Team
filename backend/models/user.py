from sqlalchemy import Column, BigInteger, Integer, String
from sqlalchemy.orm import relationship
from db.base import Base


class User(Base):
    __tablename__ = "user"
    __table_args__ = {"schema": "public"}

    user_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    email = Column(String(100), nullable=True)
    nickname = Column(String(50), nullable=True)
    social_type = Column(String(20), nullable=False)
    provider_id = Column(String(100), nullable=False)
    remain = Column(Integer, nullable=False, default=2)
    credit = Column(Integer, nullable=False, default=0)
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    gallery = relationship("UserItemImage", back_populates="user", cascade="all, delete-orphan")
    role = Column(String(20), nullable=False, default="USER")

