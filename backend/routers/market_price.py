from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from db.session import get_db
from schemas.market_price_schema import MarketPriceResponse
from services.market_price_service import get_market_price

router = APIRouter(prefix="/market-price", tags=["market-price"])


@router.get("", response_model=MarketPriceResponse)
def read_market_price(
    item_id: int | None = Query(default=None),
    umd_nm: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    if item_id is None and not umd_nm:
        raise HTTPException(status_code=400, detail="item_id or umd_nm is required.")

    result = get_market_price(db=db, item_id=item_id, umd_nm=umd_nm)
    if result is None:
        raise HTTPException(status_code=404, detail="Market price data not found.")

    return result
