import os
import io
import boto3
import torch
import psycopg2
import numpy as np
from PIL import Image
from datetime import datetime
from dotenv import load_dotenv
from transformers import CLIPModel, CLIPProcessor
from concurrent.futures import ThreadPoolExecutor
from tqdm import tqdm
from padding import pad_image

load_dotenv()

# AWS S3 연결
s3 = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_REGION')
)

# DB 연결
conn = psycopg2.connect(
    host="127.0.0.1",
    database="postgres",
    user="postgres",
    password="Enc0re!2026",
    port=15432,
    sslmode="require"
)
cur = conn.cursor()

# ================================================================
# CLIP 모델 로드
# ================================================================
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"디바이스: {device}")

print("모델 로드 중...")
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
clip_model = clip_model.to(device)
clip_model.eval()
print("✅ CLIP 로드 완료\n")

# ================================================================
# S3 다운로드 (멀티스레드용)
# ================================================================
def download_image(s3_url):
    try:
        path = s3_url.replace("s3://", "")
        bucket = path.split("/")[0]
        key = "/".join(path.split("/")[1:])
        response = s3.get_object(Bucket=bucket, Key=key)
        img_bytes = response['Body'].read()
        image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        return pad_image(image)
    except Exception as e:
        return None

# ================================================================
# 배치 임베딩 (512차원, L2 정규화)
# ================================================================
def get_batch_embeddings(images):
    inputs = clip_processor(images=images, return_tensors="pt", padding=True)
    inputs = {k: v.to(device) for k, v in inputs.items()}
    with torch.no_grad():
        feats = clip_model.get_image_features(pixel_values=inputs["pixel_values"])
        feats = feats / feats.norm(dim=-1, keepdim=True)
    return feats.cpu().detach().numpy()

def to_vector_str(embedding):
    return "[" + ",".join(map(str, embedding)) + "]"

# ================================================================
# DB 배치 저장
# ================================================================
def save_batch_to_db(batch_ids, embeddings):
    for image_id, emb in zip(batch_ids, embeddings):
        cur.execute("""
            INSERT INTO public.item_image_embeddings
                (image_id, embedding, model_name, created_at)
            VALUES (%s, %s::vector, %s, %s)
            ON CONFLICT (image_id) DO UPDATE
                SET embedding = EXCLUDED.embedding,
                    model_name = EXCLUDED.model_name,
                    created_at = EXCLUDED.created_at
        """, (
            image_id,
            to_vector_str(emb),
            "clip-vit-base-patch32",
            datetime.now()
        ))
    conn.commit()

# ================================================================
# 전체 실행
# ================================================================
def run_pipeline(batch_size=32):
    success_count = 0
    error_count = 0

    cur.execute("SELECT id, s3_url FROM item_images")
    rows = cur.fetchall()
    total = len(rows)
    print(f"총 {total}개 이미지 처리 시작 (배치 크기: {batch_size})\n")

    batches = [rows[i:i + batch_size] for i in range(0, total, batch_size)]

    with tqdm(total=total, desc="임베딩 진행중", unit="개") as pbar:
        for batch in batches:
            batch_ids = [r[0] for r in batch]
            batch_urls = [r[1] for r in batch]

            try:
                with ThreadPoolExecutor(max_workers=8) as executor:
                    images = list(executor.map(download_image, batch_urls))

                valid = [(bid, img) for bid, img in zip(batch_ids, images) if img is not None]
                if not valid:
                    pbar.update(len(batch))
                    continue

                valid_ids = [v[0] for v in valid]
                valid_images = [v[1] for v in valid]

                embeddings = get_batch_embeddings(valid_images)
                save_batch_to_db(valid_ids, embeddings)
                success_count += len(valid_ids)
                error_count += len(batch) - len(valid_ids)

            except Exception as e:
                conn.rollback()
                error_count += len(batch)
                tqdm.write(f"❌ 배치 에러: {e}")

            pbar.update(len(batch))
            pbar.set_postfix(성공=success_count, 에러=error_count)

    cur.close()
    conn.close()
    print(f"\n🎉 완료! 성공: {success_count}개 / 에러: {error_count}개")

if __name__ == "__main__":
    run_pipeline(batch_size=32)