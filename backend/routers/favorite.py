from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from db.session import get_db
from schemas.favorite_schema import (
    FavoriteToggleRequest,
    FavoriteCreateResponse,
    FavoriteItemResponse,
    FavoriteListResponse,
)
from services.favorite_service import (
    get_user_favorites,
    add_favorite,
    remove_favorite,
)

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=FavoriteListResponse)
def read_favorites(
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    favorites = get_user_favorites(db, user_id)
    return FavoriteListResponse(
        items=[
            FavoriteItemResponse(item_id=f.item_id, created_at=f.created_at)
            for f in favorites
        ]
    )


@router.post("/{item_id}", response_model=FavoriteCreateResponse)
def create_favorite(
    item_id: int,
    payload: FavoriteToggleRequest,
    db: Session = Depends(get_db),
):
    try:
        add_favorite(db, payload.user_id, item_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return FavoriteCreateResponse(
        success=True,
        item_id=item_id,
        is_favorite=True,
    )


@router.delete("/{item_id}", response_model=FavoriteCreateResponse)
def delete_favorite(
    item_id: int,
    payload: FavoriteToggleRequest,
    db: Session = Depends(get_db),
):
    remove_favorite(db, payload.user_id, item_id)

    return FavoriteCreateResponse(
        success=True,
        item_id=item_id,
        is_favorite=False,
    )