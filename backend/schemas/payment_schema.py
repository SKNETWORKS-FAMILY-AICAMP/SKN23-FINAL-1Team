from datetime import datetime
from typing import Any

from pydantic import BaseModel


class PaymentPrepareRequest(BaseModel):
    user_id: int
    product_id: str
    payment_sdk: str
    payment_channel: str


class PaymentPrepareResponse(BaseModel):
    payment_id: str
    user_id: int
    item_name: str
    amount: int
    credit_amount: int
    payment_sdk: str | None = None
    payment_channel: str | None = None
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


class PaymentWebhookRequest(BaseModel):
    payment_id: str | None = None
    paymentId: str | None = None
    merchant_uid: str | None = None
    tx_id: str | None = None
    imp_uid: str | None = None
    status: str | None = None
    data: dict[str, Any] | None = None


class PaymentWebhookResponse(BaseModel):
    payment_id: str | None = None
    status: str
    charged_credit: int
    reason: str | None = None


class PaymentOrderResponse(BaseModel):
    payment_id: str
    user_id: int
    item_name: str
    amount: int
    credit_amount: int
    payment_sdk: str | None = None
    payment_channel: str | None = None
    provider_transaction_id: str | None = None
    status: str
    created_at: datetime
    paid_at: datetime | None = None
