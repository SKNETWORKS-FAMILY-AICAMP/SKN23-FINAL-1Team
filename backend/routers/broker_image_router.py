import uuid
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from utils.s3 import get_s3_client

router = APIRouter(prefix="/brokers", tags=["brokers"])

BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "")


@router.post("/upload-photo")
async def upload_broker_photo(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    key = f"brokers/{uuid.uuid4()}.{ext}"

    try:
        s3 = get_s3_client()
        contents = await file.read()
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=contents,
            ContentType=file.content_type,
        )
        url = f"https://{BUCKET_NAME}.s3.ap-northeast-2.amazonaws.com/{key}"
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"업로드 실패: {str(e)}")


@router.get("/photo/{key:path}")
def get_broker_photo(key: str):
    try:
        s3_object = get_s3_client().get_object(Bucket=BUCKET_NAME, Key=key)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="사진을 불러올 수 없습니다.") from exc

    return StreamingResponse(
        s3_object["Body"],
        media_type=s3_object.get("ContentType") or "image/jpeg",
        headers={"Cache-Control": "private, max-age=3600"},
    )