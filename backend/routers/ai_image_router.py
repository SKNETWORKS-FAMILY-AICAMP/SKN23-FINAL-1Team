"""
기존 FastAPI 앱에 아래 라우터를 추가하세요.

사용법:
  main.py (또는 app.py) 에서:
    from routers.ai_image_router import router as ai_image_router
    app.include_router(ai_image_router)
"""

from fastapi import APIRouter
from fastapi.responses import FileResponse
from pydantic import BaseModel
from services.ai_image_service import generate_image
import os

router = APIRouter(prefix="/api")

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREATE_IMAGE_DIR = os.path.join(BACKEND_DIR, "create_image")


# ── 요청/응답 스키마 ───────────────────────────────────────────────────────────

class GenerateImageRequest(BaseModel):
    user_prompt: str
    size: str = "1024x1024"
    quality: str = "standard"
    n: int = 1


class GenerateImageResponse(BaseModel):
    file_paths: list[str]


class FindSimilarRoomsRequest(BaseModel):
    image_url: str


class SimilarListing(BaseModel):
    listingId: str
    similarity: float


class FindSimilarRoomsResponse(BaseModel):
    similar_listings: list[SimilarListing]


# ── 엔드포인트 ─────────────────────────────────────────────────────────────────

@router.post("/generate-image", response_model=GenerateImageResponse)
async def generate_image_endpoint(body: GenerateImageRequest):
    """
    사용자 한국어 프롬프트 → GPT로 영문 프롬프트 정제 → DALL-E 3 이미지 생성
    생성된 이미지를 create_image/ 폴더에 저장하고 경로를 반환합니다.
    """
    file_paths = generate_image(
        user_prompt=body.user_prompt,
        size=body.size,
        quality=body.quality,
        n=body.n,
    )
    if not file_paths:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="이미지 생성에 실패했습니다.")

    return {"file_paths": file_paths}


@router.get("/images/{filename}")
async def serve_image(filename: str):
    """
    생성된 이미지를 정적 파일로 서빙합니다.
    Next.js에서 /api/images/{filename} 으로 접근합니다.
    """
    file_path = os.path.join(CREATE_IMAGE_DIR, filename)
    if not os.path.exists(file_path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")
    return FileResponse(file_path, media_type="image/png")


@router.post("/find-similar-rooms", response_model=FindSimilarRoomsResponse)
async def find_similar_rooms_endpoint(body: FindSimilarRoomsRequest):
    """
    TODO: 실제 유사 매물 검색 로직을 여기에 연결하세요.
    현재는 find-similar-rooms 백엔드 함수를 받으면 바로 교체할 수 있도록
    인터페이스만 맞춰둔 상태입니다.
    """
    # ↓↓↓ 여기에 기존 find_similar_rooms 함수 호출로 교체하세요 ↓↓↓
    # from services.similarity_service import find_similar_rooms
    # results = find_similar_rooms(image_url=body.image_url)
    # return {"similar_listings": results}

    # 임시: 빈 배열 반환 (프론트에서 allListings.slice(0,4) 로 폴백됨)
    return {"similar_listings": []}
