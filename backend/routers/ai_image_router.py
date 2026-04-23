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
from db.base import get_db
from services.embedding_service import EmbeddingService
from services.room_service import get_rooms_by_similarity
import os
import requests

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
    # similar_listings: list[SimilarListing]
    image_url: str
    offset: int = 0
    limit: int = 12  # 보통 한 번에 12개 정도 보여주는 게 국룰이지
    # 나중에 프론트에서 필터(전세/월세 등)를 보내면 여기에 추가하면 돼
    search: str = ""
    transaction_type: str = "all"
    room_type: str = "all"
    structure: str | list[str] = "all"
    deposit: str = "all"
    monthly_rent: str = "all"
    size: str = "all"
    size_unit: str = "m2"
    floor: str = "all"
    sw_lat: float | None = None
    ne_lat: float | None = None
    sw_lng: float | None = None
    ne_lng: float | None = None


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


@router.post("/find-similar-rooms")
async def find_similar_rooms_endpoint(body: FindSimilarRoomsRequest, db: Session = Depends(get_db)):
    """
    1. 생성된 이미지 URL로 다운로드
    2. 실시간 CLIP 임베딩 추출 (0.2초의 기적)
    3. DB에서 유사도 정렬 + 필터 적용 검색
    4. 무한 스크롤 지원 형식으로 반환
    """
    try:
        print(f"[*] 이미지 다운로드 중: {body.image_url}")
        img_res = requests.get(body.image_url, timeout=5)
        if img_res.status_code != 200:
            raise HTTPException(status_code=400, detail="이미지를 불러올 수 없습니다.")
 
        image_data = img_res.content
 
        print("[*] CLIP 임베딩 추출 중...")
        embedding = EmbeddingService.get_image_embedding(image_data)
        if not embedding:
            raise HTTPException(status_code=500, detail="임베딩 추출에 실패했습니다.")
 
        print("[*] 유사 매물 검색 시작...")
        results = get_rooms_by_similarity(db, req=body, embedding=embedding)
        return results
 
    except Exception as e:
        print(f"[ERROR] find-similar-rooms: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
