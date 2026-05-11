import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.payment_order import PaymentOrder
from services.user_credit_service import get_user_by_id


CREDIT_PRODUCTS = {
    "credit_2": {
        "item_name": "크레딧 2개 충전",
        "amount": 500,
        "credit_amount": 2,
    },
    "credit_5": {
        "item_name": "크레딧 5개 충전",
        "amount": 1000,
        "credit_amount": 5,
    },
    "credit_10": {
        "item_name": "크레딧 10개 충전",
        "amount": 1500,
        "credit_amount": 10,
    },
}


def prepare_payment_order(db: Session, user_id: int, product_id: str):
    user = get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    product = CREDIT_PRODUCTS.get(product_id)
    if product is None:
        raise HTTPException(status_code=400, detail="존재하지 않는 크레딧 상품입니다.")

    payment_id = f"tc-{uuid.uuid4().hex}"
    payment_order = PaymentOrder(
        payment_id=payment_id,
        user_id=user_id,
        item_name=product["item_name"],
        amount=product["amount"],
        credit_amount=product["credit_amount"],
        status="READY",
    )

    db.add(payment_order)
    db.commit()
    db.refresh(payment_order)

    return payment_order
