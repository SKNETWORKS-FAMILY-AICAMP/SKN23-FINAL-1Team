import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.session import get_db
from models.broker import Broker
from models.user import User

router = APIRouter(prefix="/user-role", tags=["user-role"])

PHONE_PATTERN = re.compile(r"^(010-\d{4}-\d{4}|0\d{1,2}-\d{3,4}-\d{4})$")


class BrokerRegisterRequest(BaseModel):
    user_id: int
    name: str
    office_name: str
    phone: str
    photo_url: str | None = None


@router.post("/register-broker")
def register_broker(payload: BrokerRegisterRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == payload.user_id).first()

    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    if not PHONE_PATTERN.fullmatch(payload.phone.strip()):
        raise HTTPException(
            status_code=400,
            detail="연락처는 010-1234-5678 형식으로 입력해주세요.",
        )

    name = payload.name.strip()
    office_name = payload.office_name.strip()
    phone = payload.phone.strip()
    photo_url = payload.photo_url.strip() if payload.photo_url else None

    if not name or not office_name or not phone:
        raise HTTPException(status_code=400, detail="필수 정보를 모두 입력해주세요.")

    broker = db.query(Broker).filter(Broker.broker_id == payload.user_id).first()

    if broker is None:
        broker = Broker(
            broker_id=payload.user_id,
            name=name,
            office_name=office_name,
            phone=phone,
            photo_url=photo_url,
        )
        db.add(broker)
    else:
        broker.name = name
        broker.office_name = office_name
        broker.phone = phone
        broker.photo_url = photo_url

    user.role = "BROKER"
    db.commit()
    db.refresh(user)

    return {
        "user_id": user.user_id,
        "role": user.role,
        "broker": {
            "broker_id": broker.broker_id,
            "name": broker.name,
            "office_name": broker.office_name,
            "phone": broker.phone,
            "photo_url": broker.photo_url,
        },
    }
