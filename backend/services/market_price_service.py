from sqlalchemy import select
from sqlalchemy.orm import Session

from models.market_price import MarketPriceSummary, MarketPriceTimeseries, RecentPrice
from models.room import Room
from schemas.market_price_schema import (
    MarketPricePointResponse,
    MarketPriceResponse,
    RecentPriceResponse,
)


def rent_manwon_to_won_rounded(value: float | None) -> int | None:
    if value is None:
        return None

    return round((float(value) * 10000) / 100) * 100


def get_market_price(db: Session, umd_nm: str | None = None, item_id: int | None = None):
    target_umd_nm = umd_nm

    if not target_umd_nm and item_id is not None:
        room = db.execute(select(Room).where(Room.item_id == item_id)).scalar_one_or_none()
        if room is None:
            return None
        target_umd_nm = _find_umd_nm_from_address(db, room.address)

    if not target_umd_nm:
        return None

    summary = (
        db.query(MarketPriceSummary)
        .filter(MarketPriceSummary.umdNm == target_umd_nm)
        .first()
    )
    if summary is None:
        return None

    timeseries = (
        db.query(MarketPriceTimeseries)
        .filter(MarketPriceTimeseries.umdNm == summary.umdNm)
        .order_by(MarketPriceTimeseries.dealDate.asc())
        .all()
    )
    recent_prices = (
        db.query(RecentPrice)
        .filter(RecentPrice.umdnm == summary.umdNm)
        .order_by(
            RecentPrice.dealyear.desc(),
            RecentPrice.dealmonth.desc(),
            RecentPrice.price_id.desc(),
        )
        .limit(5)
        .all()
    )

    return MarketPriceResponse(
        umdNm=summary.umdNm,
        guNm=summary.guNm,
        grade=summary.grade,
        analysis_scope=summary.analysis_scope,
        current_rent_per_m2_won=rent_manwon_to_won_rounded(summary.current_rent_per_m2),
        five_year_change_rate=summary.five_year_change_rate,
        predicted_rent_per_m2_won=rent_manwon_to_won_rounded(summary.predicted_rent_per_m2),
        change_rate=summary.change_rate,
        status_label=summary.status_label,
        timeseries=[
            MarketPricePointResponse(
                dealDate=row.dealDate,
                rent_per_m2_won=rent_manwon_to_won_rounded(row.rent_per_m2),
            )
            for row in timeseries
        ],
        recent_prices=[
            RecentPriceResponse(
                price_id=row.price_id,
                deal_year=row.dealyear,
                deal_month=row.dealmonth,
                build_year=row.buildyear,
                deposit=row.deposit,
                monthly_rent=row.monthlyrent,
                area_m2=row.excluusear,
                floor=row.roomfloor,
                room_class=row.roomclass,
            )
            for row in recent_prices
        ],
    )


def _find_umd_nm_from_address(db: Session, address: str | None) -> str | None:
    if not address:
        return None

    rows = db.query(MarketPriceSummary.umdNm).all()
    candidates = [row[0] for row in rows if row[0] and row[0] in address]
    if not candidates:
        return None

    return max(candidates, key=len)
