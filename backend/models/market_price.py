from sqlalchemy import Column, Float, Integer, SmallInteger, String, Text

from db.base import Base


class MarketPriceSummary(Base):
    __tablename__ = "market_price_summary"
    __table_args__ = {"schema": "public"}

    umdNm = Column("umdNm", Text, primary_key=True)
    guNm = Column("guNm", Text, nullable=True)
    grade = Column(Text, nullable=True)
    analysis_scope = Column(Text, nullable=True)
    current_rent_per_m2 = Column(Float, nullable=True)
    five_year_change_rate = Column(Float, nullable=True)
    predicted_rent_per_m2 = Column(Float, nullable=True)
    change_rate = Column(Float, nullable=True)
    status_label = Column(Text, nullable=True)


class MarketPriceTimeseries(Base):
    __tablename__ = "market_price_timeseries"
    __table_args__ = {"schema": "public"}

    umdNm = Column("umdNm", Text, primary_key=True)
    dealDate = Column("dealDate", String, primary_key=True)
    rent_per_m2 = Column(Float, nullable=True)


class RecentPrice(Base):
    __tablename__ = "recent_price"
    __table_args__ = {"schema": "public"}

    price_id = Column(Integer, primary_key=True, autoincrement=True)
    buildyear = Column(SmallInteger, nullable=False)
    dealmonth = Column(SmallInteger, nullable=False)
    dealyear = Column(SmallInteger, nullable=False)
    deposit = Column(Integer, nullable=False)
    excluusear = Column(SmallInteger, nullable=False)
    roomfloor = Column(SmallInteger, nullable=False)
    monthlyrent = Column(Integer, nullable=False)
    umdnm = Column(String(20), nullable=False)
    roomclass = Column(String(10), nullable=False)
