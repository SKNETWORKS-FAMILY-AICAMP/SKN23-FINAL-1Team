from sqlalchemy import Column, BigInteger, String
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
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    gallery = relationship("UserItemImage", back_populates="user", cascade="all, delete-orphan")


