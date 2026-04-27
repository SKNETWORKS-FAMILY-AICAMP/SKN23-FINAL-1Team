"""
기존 FastAPI 앱에 아래 라우터를 추가하세요.

사용법:
  main.py (또는 app.py) 에서:
    from routers.ai_image_router import router as ai_image_router
    app.include_router(ai_image_router)
"""

import os

import requests
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from openai import BadRequestError
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.session import get_db
from schemas.room_schema import RoomListRequest
from services.ai_image_service import edit_image, generate_image
from services.embedding_service import EmbeddingService
from services.room_service import get_rooms_by_similarity

router = APIRouter(prefix="/api")

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREATE_IMAGE_DIR = os.path.join(BACKEND_DIR, "create_image")


# ── 요청/응답 스키마 ───────────────────────────────────────────────────────────

class GenerateImageRequest(BaseModel):
    user_prompt: str
    size: str = "1024x1024"
    quality: str = "medium"
    n: int = 4


class EditImageRequest(BaseModel):
    source_image_url: str
    base_prompt: str
    edit_prompt: str
    size: str = "1024x1024"
    n: int = 4


class ImageResponse(BaseModel):
    file_paths: list[str]


class FindSimilarRoomsRequest(RoomListRequest):
    image_url: str


# ── 엔드포인트 ─────────────────────────────────────────────────────────────────

@router.post("/generate-image", response_model=ImageResponse)
async def generate_image_endpoint(body: GenerateImageRequest):
    """
    사용자 한국어 프롬프트 → GPT로 영문 프롬프트 정제 → 이미지 생성
    생성된 이미지를 create_image/ 폴더에 저장하고 경로를 반환합니다.
    """
    file_paths = generate_image(
        user_prompt=body.user_prompt,
        size=body.size,
        quality=body.quality,
        n=body.n,
    )

    if not file_paths:
        raise HTTPException(status_code=500, detail="이미지 생성에 실패했습니다.")

    return {"file_paths": file_paths}


@router.post("/edit-image", response_model=ImageResponse)
async def edit_image_endpoint(body: EditImageRequest):
    """
    생성 후 저장된 원본 이미지를 create_image/ 폴더에서 다시 읽어와
    수정 프롬프트를 반영한 새 이미지를 생성하고 경로를 반환합니다.
    """
    try:
        file_paths = edit_image(
            source_image_url=body.source_image_url,
            base_prompt=body.base_prompt,
            edit_prompt=body.edit_prompt,
            size=body.size,
            n=body.n,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except BadRequestError as exc:
        detail = getattr(exc, "body", {}) or {}
        message = detail.get("error", {}).get("message", str(exc))
        raise HTTPException(status_code=400, detail=message) from exc
    except requests.HTTPError as exc:
        response = exc.response
        detail = {}
        if response is not None:
            try:
                detail = response.json()
            except ValueError:
                detail = {}

        message = detail.get("error", {}).get("message", str(exc))
        status_code = response.status_code if response is not None else 500
        raise HTTPException(status_code=status_code, detail=message) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not file_paths:
        raise HTTPException(status_code=500, detail="이미지 수정에 실패했습니다.")

    return {"file_paths": file_paths}


@router.get("/images/{filename}")
async def serve_image(filename: str):
    """
    생성된 이미지를 정적 파일로 서빙합니다.
    Next.js에서 /api/images/{filename} 으로 접근합니다.
    """
    file_path = os.path.join(CREATE_IMAGE_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")

    return FileResponse(file_path, media_type="image/png")


@router.post("/find-similar-rooms")
async def find_similar_rooms_endpoint(
    body: FindSimilarRoomsRequest,
    db: Session = Depends(get_db),
):
    """
    1. 생성된 이미지 URL로 다운로드
    2. 실시간 CLIP 임베딩 추출
    3. DB에서 유사도 정렬 + 필터 적용 검색
    4. 무한 스크롤 지원 형식으로 반환
    """
    try:
        image_response = requests.get(body.image_url, timeout=5)
        if image_response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="이미지를 불러올 수 없습니다.",
            )

        image_data = image_response.content
        embedding = EmbeddingService.get_image_embedding(image_data)

        if not embedding:
            raise HTTPException(
                status_code=500,
                detail="이미지 임베딩 추출에 실패했습니다.",
            )

        return get_rooms_by_similarity(db, req=body, embedding=embedding)
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] find-similar-rooms: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
