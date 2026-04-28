from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.session import get_db
from services.user_credit_service import increment_user_credit
from services.user_credit_service import get_user_by_id

router = APIRouter(prefix="/user-credit", tags=["user-credit"])


class IncrementCreditRequest(BaseModel):
    user_id: int


@router.post("/increment")
def increment_credit(payload: IncrementCreditRequest, db: Session = Depends(get_db)):
    user = increment_user_credit(db, payload.user_id)

    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    return {
        "user_id": user.user_id,
        "credit": user.credit,
        "remain": user.remain,
    }


@router.get("")
def read_user_credit(user_id: int, db: Session = Depends(get_db)):
    user = get_user_by_id(db, user_id)

    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    return {
        "user_id": user.user_id,
        "credit": user.credit,
        "remain": user.remain,
    }
