from pydantic import BaseModel


class MarketPricePointResponse(BaseModel):
    dealDate: str
    rent_per_m2_won: int | None = None


class RecentPriceResponse(BaseModel):
    price_id: int
    deal_year: int
    deal_month: int
    build_year: int
    deposit: int
    monthly_rent: int
    area_m2: int
    floor: int
    room_class: str


class MarketPriceResponse(BaseModel):
    umdNm: str
    guNm: str | None = None
    grade: str | None = None
    analysis_scope: str | None = None
    current_rent_per_m2_won: int | None = None
    five_year_change_rate: float | None = None
    predicted_rent_per_m2_won: int | None = None
    change_rate: float | None = None
    status_label: str | None = None
    timeseries: list[MarketPricePointResponse] = []
    recent_prices: list[RecentPriceResponse] = []
