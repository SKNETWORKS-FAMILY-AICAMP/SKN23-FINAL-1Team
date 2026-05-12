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
    market_type = None

    if not target_umd_nm and item_id is not None:
        room = db.execute(select(Room).where(Room.item_id == item_id)).scalar_one_or_none()
        if room is None:
            return None
        target_umd_nm = _find_umd_nm_from_address(db, room.address)
        market_type = _get_room_market_type(room)

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
    recent_prices = []
    recent_price_types = _get_recent_price_types(market_type)
    if recent_price_types:
        recent_prices = (
            db.query(RecentPrice)
            .filter(
                RecentPrice.umdnm == summary.umdNm,
                RecentPrice.roomclass.in_(recent_price_types),
            )
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
        market_type=market_type,
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


def _get_room_market_type(room: Room) -> str | None:
    service_type = (room.service_type or "").strip()
    if service_type in {"전세", "월세", "반전세"}:
        return service_type

    if "반전세" in service_type:
        return "반전세"
    if "전세" in service_type and "반전세" not in service_type:
        return "전세"
    if "월세" in service_type:
        return "월세"

    if int(room.rent or 0) <= 0:
        return "전세"

    return None


def _get_recent_price_types(market_type: str | None) -> list[str]:
    if market_type == "전세":
        return ["전세"]

    if market_type in {"월세", "반전세"}:
        return ["월세", "반전세"]

    return []
