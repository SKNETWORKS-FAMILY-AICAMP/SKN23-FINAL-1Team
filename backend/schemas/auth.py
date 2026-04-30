from pydantic import BaseModel, EmailStr
from typing import Optional, Literal


class SocialLoginRequest(BaseModel):
    social_type: Literal["kakao", "google", "naver"]
    provider_id: str
    email: Optional[EmailStr] = None


class SocialLoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict
