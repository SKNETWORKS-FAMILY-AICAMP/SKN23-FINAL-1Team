from pydantic import BaseModel


class PaymentPrepareRequest(BaseModel):
    user_id: int
    product_id: str


class PaymentPrepareResponse(BaseModel):
    payment_id: str
    user_id: int
    item_name: str
    amount: int
    credit_amount: int
    status: str
