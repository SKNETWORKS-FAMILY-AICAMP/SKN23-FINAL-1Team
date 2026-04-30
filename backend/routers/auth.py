from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.session import get_db
from schemas.auth import SocialLoginRequest
from services.social_auth_service import get_or_create_social_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/social-login")
def social_login(payload: SocialLoginRequest, db: Session = Depends(get_db)):
    if not payload.provider_id:
        raise HTTPException(status_code=400, detail="provider_id가 필요합니다.")

    user, is_new = get_or_create_social_user(
        db,
        email=payload.email,
        social_type=payload.social_type,
        provider_id=payload.provider_id,
    )

    access_token = f"access-token-{user.user_id}"
    refresh_token = f"refresh-token-{user.user_id}"

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "email": user.email,
            "nickname": user.nickname,
            "social_type": user.social_type,
            "provider_id": user.provider_id,
            "remain": user.remain,
            "credit": user.credit,
            "is_new": is_new,
        },
    }
