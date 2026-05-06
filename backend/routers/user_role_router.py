from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.session import get_db
from models.user import User

router = APIRouter(prefix="/user-role", tags=["user-role"])

class BrokerRegisterRequest(BaseModel):
    user_id: int
    office_name: str
    broker_number: str

@router.post("/register-broker")
def register_broker(payload: BrokerRegisterRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == payload.user_id).first()
    
    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    
    if user.role == "BROKER":
        raise HTTPException(status_code=400, detail="이미 중개사 인증된 사용자입니다.")
    
    user.role = "BROKER"
    db.commit()
    db.refresh(user)
    
    return {
        "user_id": user.user_id,
        "role": user.role,
    }