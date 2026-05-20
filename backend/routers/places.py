from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from db.session import get_db
from services.place_search_service import search_places

router = APIRouter(prefix="/places", tags=["places"])


@router.get("/search")
def search_place_autocomplete(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=20),
    db: Session = Depends(get_db),
):
    return {"items": search_places(db, q, limit)}
