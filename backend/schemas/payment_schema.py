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


class PaymentCompleteRequest(BaseModel):
    user_id: int
    payment_id: str
    provider_transaction_id: str | None = None


class PaymentCompleteResponse(BaseModel):
    payment_id: str
    user_id: int
    credit: int
    remain: int
    charged_credit: int
    status: str
