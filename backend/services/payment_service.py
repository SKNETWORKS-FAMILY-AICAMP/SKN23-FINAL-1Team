import uuid
from datetime import datetime, timezone

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


def complete_payment_order(
    db: Session,
    user_id: int,
    payment_id: str,
    provider_transaction_id: str | None = None,
):
    payment_order = (
        db.query(PaymentOrder)
        .filter(PaymentOrder.payment_id == payment_id)
        .first()
    )
    if payment_order is None or payment_order.user_id != user_id:
        raise HTTPException(status_code=404, detail="寃곗젣 二쇰Ц???李얠쓣 ???놁뒿?덈떎.")

    user = get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="?ъ슜?먮? 李얠쓣 ???놁뒿?덈떎.")

    if payment_order.status == "PAID":
        return {
            "payment_id": payment_order.payment_id,
            "user_id": user.user_id,
            "credit": user.credit,
            "remain": user.remain,
            "charged_credit": 0,
            "status": payment_order.status,
        }

    if payment_order.status != "READY":
        raise HTTPException(status_code=400, detail="泥섎━???????녿뒗 寃곗젣 二쇰Ц?낅땲??")

    user.credit += payment_order.credit_amount
    payment_order.status = "PAID"
    payment_order.paid_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(user)
    db.refresh(payment_order)

    return {
        "payment_id": payment_order.payment_id,
        "user_id": user.user_id,
        "credit": user.credit,
        "remain": user.remain,
        "charged_credit": payment_order.credit_amount,
        "status": payment_order.status,
    }
