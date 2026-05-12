from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from db.session import get_db
from schemas.payment_schema import (
    PaymentCompleteRequest,
    PaymentCompleteResponse,
    PaymentOrderResponse,
    PaymentPrepareRequest,
    PaymentPrepareResponse,
    PaymentWebhookRequest,
    PaymentWebhookResponse,
)
from services.payment_service import (
    complete_payment_order,
    complete_payment_order_from_webhook,
    get_payment_orders,
    prepare_payment_order,
)

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/prepare", response_model=PaymentPrepareResponse)
def prepare_payment(payload: PaymentPrepareRequest, db: Session = Depends(get_db)):
    payment_order = prepare_payment_order(
        db=db,
        user_id=payload.user_id,
        product_id=payload.product_id,
        payment_sdk=payload.payment_sdk,
        payment_channel=payload.payment_channel,
    )

    return {
        "payment_id": payment_order.payment_id,
        "user_id": payment_order.user_id,
        "item_name": payment_order.item_name,
        "amount": payment_order.amount,
        "credit_amount": payment_order.credit_amount,
        "payment_sdk": payment_order.payment_sdk,
        "payment_channel": payment_order.payment_channel,
        "status": payment_order.status,
    }


@router.post("/complete", response_model=PaymentCompleteResponse)
def complete_payment(payload: PaymentCompleteRequest, db: Session = Depends(get_db)):
    return complete_payment_order(
        db=db,
        user_id=payload.user_id,
        payment_id=payload.payment_id,
        provider_transaction_id=payload.provider_transaction_id,
    )


@router.post("/webhook", response_model=PaymentWebhookResponse)
def payment_webhook(payload: PaymentWebhookRequest, db: Session = Depends(get_db)):
    webhook_data = payload.data or {}
    print(f"[payments/webhook] payload={payload.model_dump()}", flush=True)
    payment_id = (
        payload.payment_id
        or payload.paymentId
        or payload.merchant_uid
        or webhook_data.get("payment_id")
        or webhook_data.get("paymentId")
        or webhook_data.get("merchant_uid")
    )
    if not payment_id:
        return {
            "payment_id": None,
            "status": "IGNORED",
            "charged_credit": 0,
            "reason": "payment_id or merchant_uid is missing.",
        }

    try:
        result = complete_payment_order_from_webhook(
            db=db,
            payment_id=payment_id,
            provider_transaction_id=(
                payload.imp_uid
                or payload.tx_id
                or webhook_data.get("imp_uid")
                or webhook_data.get("tx_id")
                or webhook_data.get("transactionId")
            ),
        )
    except HTTPException as error:
        if error.status_code >= 500:
            raise

        return {
            "payment_id": payment_id,
            "status": "IGNORED",
            "charged_credit": 0,
            "reason": str(error.detail),
        }

    return {
        "payment_id": result["payment_id"],
        "status": result["status"],
        "charged_credit": result["charged_credit"],
    }


@router.get("/orders", response_model=list[PaymentOrderResponse])
def list_payment_orders(
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    return get_payment_orders(db=db, user_id=user_id)
