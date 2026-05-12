import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.payment_order import PaymentOrder
from services.portone_verification_service import verify_v1_payment, verify_v2_payment
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


def prepare_payment_order(
    db: Session,
    user_id: int,
    product_id: str,
    payment_sdk: str,
    payment_channel: str,
):
    user = get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    product = CREDIT_PRODUCTS.get(product_id)
    if product is None:
        raise HTTPException(status_code=400, detail="Unknown credit product.")

    payment_id = f"tc-{uuid.uuid4().hex}"
    payment_order = PaymentOrder(
        payment_id=payment_id,
        user_id=user_id,
        item_name=product["item_name"],
        amount=product["amount"],
        credit_amount=product["credit_amount"],
        payment_sdk=payment_sdk,
        payment_channel=payment_channel,
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
        raise HTTPException(status_code=404, detail="Payment order not found.")

    user = get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    return _complete_verified_payment_order(
        db=db,
        payment_order=payment_order,
        user=user,
        provider_transaction_id=provider_transaction_id,
    )


def complete_payment_order_from_webhook(
    db: Session,
    payment_id: str,
    provider_transaction_id: str | None = None,
):
    payment_order = (
        db.query(PaymentOrder)
        .filter(PaymentOrder.payment_id == payment_id)
        .first()
    )
    if payment_order is None:
        raise HTTPException(status_code=404, detail="Payment order not found.")

    user = get_user_by_id(db, payment_order.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    return _complete_verified_payment_order(
        db=db,
        payment_order=payment_order,
        user=user,
        provider_transaction_id=provider_transaction_id,
    )


def get_payment_orders(db: Session, user_id: int):
    return (
        db.query(PaymentOrder)
        .filter(PaymentOrder.user_id == user_id)
        .order_by(PaymentOrder.created_at.desc())
        .all()
    )


def _complete_verified_payment_order(
    db: Session,
    payment_order: PaymentOrder,
    user,
    provider_transaction_id: str | None = None,
):
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
        raise HTTPException(status_code=400, detail="Payment order cannot be completed.")

    verification = _verify_payment_order(payment_order, provider_transaction_id)
    payment_order.provider_transaction_id = (
        verification.get("provider_transaction_id") or provider_transaction_id
    )

    if not verification["ok"]:
        print(
            "[payments] verification failed "
            f"payment_id={payment_order.payment_id} "
            f"sdk={payment_order.payment_sdk} "
            f"provider_status={verification.get('status')} "
            f"amount={verification.get('amount')} "
            f"reason={verification.get('reason')} "
            f"terminal={verification.get('terminal')}",
            flush=True,
        )
        if verification.get("terminal"):
            payment_order.status = "FAILED"
        db.commit()
        raise HTTPException(
            status_code=400,
            detail=verification.get("reason") or "Payment verification failed.",
        )

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


def _verify_payment_order(
    payment_order: PaymentOrder,
    provider_transaction_id: str | None,
):
    payment_sdk = (payment_order.payment_sdk or "").upper()

    if payment_sdk == "V1":
        return verify_v1_payment(
            imp_uid=provider_transaction_id,
            merchant_uid=payment_order.payment_id,
            expected_amount=payment_order.amount,
        )

    if payment_sdk == "V2":
        return verify_v2_payment(
            payment_id=payment_order.payment_id,
            expected_amount=payment_order.amount,
        )

    raise HTTPException(status_code=400, detail="Unknown payment SDK.")
