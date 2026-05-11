from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.session import get_db
from schemas.payment_schema import PaymentPrepareRequest, PaymentPrepareResponse
from services.payment_service import prepare_payment_order

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/prepare", response_model=PaymentPrepareResponse)
def prepare_payment(payload: PaymentPrepareRequest, db: Session = Depends(get_db)):
    payment_order = prepare_payment_order(
        db=db,
        user_id=payload.user_id,
        product_id=payload.product_id,
    )

    return {
        "payment_id": payment_order.payment_id,
        "user_id": payment_order.user_id,
        "item_name": payment_order.item_name,
        "amount": payment_order.amount,
        "credit_amount": payment_order.credit_amount,
        "status": payment_order.status,
    }
