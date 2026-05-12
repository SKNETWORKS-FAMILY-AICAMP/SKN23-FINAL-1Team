import os
import logging
from typing import Any

import requests
from fastapi import HTTPException


logger = logging.getLogger(__name__)
PORTONE_V2_API_BASE_URL = os.getenv("PORTONE_V2_API_BASE_URL", "https://api.portone.io")
PORTONE_V1_API_BASE_URL = os.getenv("PORTONE_V1_API_BASE_URL", "https://api.iamport.kr")


def _log_portone_error(message: str, *args):
    logger.error(message, *args)
    rendered_message = message % args if args else message
    print(f"[portone] {rendered_message}", flush=True)


def _request_json(method: str, url: str, **kwargs):
    try:
        response = requests.request(method, url, timeout=10, **kwargs)
    except requests.RequestException as error:
        logger.exception("PortOne API request failed. method=%s url=%s", method, url)
        print(f"[portone] API request failed. method={method} url={url} error={error}", flush=True)
        raise HTTPException(status_code=502, detail="PortOne API request failed.") from error

    if response.status_code >= 400:
        _log_portone_error(
            "PortOne API returned an error. method=%s url=%s status=%s body=%s",
            method,
            url,
            response.status_code,
            response.text[:500],
        )
        raise HTTPException(
            status_code=502,
            detail=f"PortOne API returned an error. status={response.status_code}",
        )

    try:
        return response.json()
    except ValueError as error:
        _log_portone_error(
            "PortOne API response is invalid JSON. method=%s url=%s body=%s",
            method,
            url,
            response.text[:500],
        )
        raise HTTPException(status_code=502, detail="PortOne API response is invalid.") from error


def _extract_v2_amount(payment: dict[str, Any]):
    amount = payment.get("amount")
    if isinstance(amount, dict):
        return amount.get("total") or amount.get("paid")

    return payment.get("totalAmount") or payment.get("paidAmount")


def _extract_v2_payment(payload: dict[str, Any]):
    payment = payload.get("payment")
    if isinstance(payment, dict):
        return payment

    return payload


def verify_v2_payment(payment_id: str, expected_amount: int):
    api_secret = os.getenv("PORTONE_API_SECRET")
    if not api_secret:
        _log_portone_error("PORTONE_API_SECRET is missing.")
        raise HTTPException(status_code=500, detail="PORTONE_API_SECRET is missing.")

    payload = _request_json(
        "GET",
        f"{PORTONE_V2_API_BASE_URL}/payments/{payment_id}",
        headers={
            "Authorization": f"PortOne {api_secret}",
            "Accept": "application/json",
        },
    )
    payment = _extract_v2_payment(payload)

    status = payment.get("status")
    paid_amount = _extract_v2_amount(payment)

    if status != "PAID":
        return {
            "ok": False,
            "status": status,
            "amount": paid_amount,
            "reason": "Payment is not paid.",
        }

    if paid_amount != expected_amount:
        return {
            "ok": False,
            "status": status,
            "amount": paid_amount,
            "reason": "Payment amount does not match.",
        }

    return {
        "ok": True,
        "status": status,
        "amount": paid_amount,
        "provider_transaction_id": payment_id,
    }


def _get_v1_access_token():
    rest_api_key = os.getenv("PORTONE_REST_API_KEY")
    rest_api_secret = os.getenv("PORTONE_REST_API_SECRET")

    if not rest_api_key or not rest_api_secret:
        _log_portone_error("PORTONE_REST_API_KEY or PORTONE_REST_API_SECRET is missing.")
        raise HTTPException(
            status_code=500,
            detail="PORTONE_REST_API_KEY or PORTONE_REST_API_SECRET is missing.",
        )

    data = _request_json(
        "POST",
        f"{PORTONE_V1_API_BASE_URL}/users/getToken",
        headers={"Content-Type": "application/json"},
        json={
            "imp_key": rest_api_key,
            "imp_secret": rest_api_secret,
        },
    )

    if data.get("code") != 0 or not data.get("response", {}).get("access_token"):
        _log_portone_error("Could not get PortOne V1 access token. response=%s", str(data)[:500])
        raise HTTPException(status_code=502, detail="Could not get PortOne V1 access token.")

    return data["response"]["access_token"]


def verify_v1_payment(
    imp_uid: str | None,
    merchant_uid: str,
    expected_amount: int,
):
    access_token = _get_v1_access_token()

    try:
        data = _request_json(
            "GET",
            f"{PORTONE_V1_API_BASE_URL}/payments/find/{merchant_uid}/paid",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
        )
    except HTTPException:
        if not imp_uid:
            raise

        data = _request_json(
            "GET",
            f"{PORTONE_V1_API_BASE_URL}/payments/{imp_uid}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
        )

    if data.get("code") != 0 or not data.get("response"):
        _log_portone_error("Could not get PortOne V1 payment. response=%s", str(data)[:500])
        raise HTTPException(status_code=502, detail="Could not get PortOne V1 payment.")

    payment = data["response"]
    status = payment.get("status")
    paid_amount = payment.get("amount")
    paid_merchant_uid = payment.get("merchant_uid")

    if paid_merchant_uid != merchant_uid:
        return {
            "ok": False,
            "status": status,
            "amount": paid_amount,
            "reason": "Payment order id does not match.",
        }

    if status != "paid":
        return {
            "ok": False,
            "status": status,
            "amount": paid_amount,
            "reason": "Payment is not paid.",
        }

    if paid_amount != expected_amount:
        return {
            "ok": False,
            "status": status,
            "amount": paid_amount,
            "reason": "Payment amount does not match.",
        }

    return {
        "ok": True,
        "status": status,
        "amount": paid_amount,
        "provider_transaction_id": payment.get("imp_uid") or imp_uid,
    }
