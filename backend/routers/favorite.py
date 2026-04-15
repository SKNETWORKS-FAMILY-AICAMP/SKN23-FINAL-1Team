from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from schemas.favorite_schema import (
    FavoriteCreateResponse,
    FavoriteItemResponse,
    FavoriteListResponse,
)
from services.favorite_service import get_user_favorites, add_favorite, remove_favorite
from auth import get_current_user

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=FavoriteListResponse)
def read_favorites(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    favorites = get_user_favorites(db, current_user.user_id)
    return FavoriteListResponse(
        items=[
            FavoriteItemResponse(item_id=f.item_id, created_at=f.created_at)
            for f in favorites
        ]
    )


@router.post("/{item_id}", response_model=FavoriteCreateResponse)
def create_favorite(
    item_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        add_favorite(db, current_user.user_id, item_id)
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
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    deleted = remove_favorite(db, current_user.user_id, item_id)

    return FavoriteCreateResponse(
        success=True,
        item_id=item_id,
        is_favorite=False if deleted else False,
    )