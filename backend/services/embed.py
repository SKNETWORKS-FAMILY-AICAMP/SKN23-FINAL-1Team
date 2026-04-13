import boto3
import requests
import time
import json
import base64
import io
import os
import sys
from datetime import datetime, timedelta # 💡 전날 계산용
from PIL import Image
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

# --- [1. 환경 변수 및 날짜 설정] ---
# 프로젝트 루트 디렉토리의 .env 파일을 로드합니다.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)


def get_env(key, default=None):
    value = os.getenv(key, default)
    return value.strip() if value else ""

# 날짜 결정 (오늘과 어제)
if len(sys.argv) > 1:
    TARGET_DATE = sys.argv[1]
else:
    TARGET_DATE = datetime.now().strftime('%Y-%m-%d')

# 💡 어제 날짜 계산 (비교용)
yesterday_dt = datetime.strptime(TARGET_DATE, '%Y-%m-%d') - timedelta(days=1)
YESTERDAY_DATE = yesterday_dt.strftime('%Y-%m-%d')

# 설정값 로드
ENDPOINT_ID = get_env("RUNPOD_ENDPOINT_ID", "qe53rai5249pyf")
RUNPOD_KEY = get_env("RUNPOD_API_KEY")
AWS_ACCESS = get_env("AWS_ACCESS_KEY_ID")
AWS_SECRET = get_env("AWS_SECRET_ACCESS_KEY")
BUCKET_NAME = get_env("S3_BUCKET_NAME")
REGION = os.getenv("AWS_REGION", "ap-northeast-2")

# 경로 및 파일명 (오늘 기준)
PREFIX = f"zigbang_data/images/seoul/{TARGET_DATE}/"
SAVE_FILENAME = f"embedding_{TARGET_DATE}.jsonl"
YESTERDAY_FILENAME = f"embedding_{YESTERDAY_DATE}.jsonl" # 💡 어제 결과 파일
MAX_WORKERS = int(os.getenv("MAX_WORKERS", 10))

def process_single_image(s3_client, key):
    """Base64 변환 및 RunPod 요청 (생략)"""
    try:
        obj = s3_client.get_object(Bucket=BUCKET_NAME, Key=key)
        img = Image.open(io.BytesIO(obj['Body'].read())).convert('RGB')
        img.thumbnail((224, 224))
        
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=80)
        img_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        
        headers = {"Authorization": f"Bearer {RUNPOD_KEY}", "Content-Type": "application/json"}
        payload = {"input": {"model": "clip", "input": f"data:image/jpeg;base64,{img_b64}"}}
        
        run_url = f"https://api.runpod.ai/v2/{ENDPOINT_ID}/run"
        res = requests.post(run_url, json=payload, headers=headers, timeout=20)
        
        if res.status_code == 401: return "AUTH_ERROR"
        job_id = res.json().get("id")
        
        status_url = f"https://api.runpod.ai/v2/{ENDPOINT_ID}/status/{job_id}"
        while True:
            status_res = requests.get(status_url, headers=headers, timeout=10).json()
            if status_res.get("status") == "COMPLETED":
                return status_res.get('output')
            elif status_res.get("status") in ["FAILED", "CANCELLED"]:
                return None
            time.sleep(0.5)
    except: return None

def run_embedding_pipeline():
    print(f"📅 작업 기준일: {TARGET_DATE} (비교 대상: {YESTERDAY_DATE})")
    
    s3 = boto3.client('s3', aws_access_key_id=AWS_ACCESS, aws_secret_access_key=AWS_SECRET, region_name=REGION)

    # 1. 중복 제거용 데이터 로드 (어제 파일 + 오늘 작업 중이던 파일)
    processed_keys = set()
    for fname in [SAVE_FILENAME, YESTERDAY_FILENAME]:
        if os.path.exists(fname):
            with open(fname, "r", encoding="utf-8") as f:
                for line in f:
                    try: processed_keys.add(json.loads(line)['image_key'])
                    except: continue

    # 2. S3 스캔
    all_keys = []
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=BUCKET_NAME, Prefix=PREFIX):
        if 'Contents' in page:
            for obj in page['Contents']:
                k = obj['Key']
                if k.lower().endswith(('.jpg', '.png', '.jpeg')) and k not in processed_keys:
                    all_keys.append(k)

    total = len(all_keys)
    if total == 0:
        print(f"✅ 추가로 처리할 신규 매물이 없습니다.")
        return

    print(f"🚀 신규 이미지 {total}개 작업을 시작합니다.")

    with open(SAVE_FILENAME, "a", encoding="utf-8") as f:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_key = {executor.submit(process_single_image, s3, key): key for key in all_keys}
            for i, future in enumerate(as_completed(future_to_key), 1):
                res = future.result()
                key = future_to_key[future]
                if res == "AUTH_ERROR": os._exit(1)
                if res:
                    f.write(json.dumps({"image_key": key, "embedding": res}, ensure_ascii=False) + "\n")
                    f.flush()
                    os.fsync(f.fileno()) 
                    print(f"[{i}/{total}] ✅ {key.split('/')[-1]}")

if __name__ == "__main__":
    run_embedding_pipeline()