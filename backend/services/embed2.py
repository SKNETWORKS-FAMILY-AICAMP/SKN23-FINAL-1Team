import os
import io
import time
import base64
import requests
import psycopg2
import boto3
from PIL import Image
from urllib.parse import unquote
from dotenv import load_dotenv
from psycopg2.extras import execute_values
from concurrent.futures import ThreadPoolExecutor
import numpy as np

load_dotenv()

# [1. 환경 설정]
TARGET_MODEL = "openai/clip-vit-base-patch32"
MAX_THREADS = 5
API_BATCH_SIZE = 100 
DB_FETCH_SIZE = 1000
WEBHOOK_URL = os.getenv("WEBHOOK_URL_SERVERLESS")

# [2. 전역 변수]
total_success = 0
skipped_ids = set() # 이번 실행 중 S3 실패한 ID들을 저장 (메모리 격리)

BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
REGION = os.getenv("AWS_REGION", "ap-northeast-2")

s3_client = boto3.client('s3', 
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=REGION
)

def get_actual_vector(data):
    """Infinity 응답 구조에서 벡터 추출 후 L2 정규화 수행"""
    vector = None
    
    # 1. 재귀적으로 실제 숫자 리스트(벡터) 찾기
    if isinstance(data, list) and len(data) > 0:
        if isinstance(data[0], (int, float)): 
            vector = data
        else:
            vector = get_actual_vector(data[0])
    elif isinstance(data, dict):
        for key in ['embedding', 'data', 'values']:
            if key in data:
                res = get_actual_vector(data[key])
                if res: 
                    vector = res
                    break
    
    # 2. [정규화 로직] 벡터를 찾았으면 길이를 1로 만듦
    if vector is not None:
        arr = np.array(vector, dtype=np.float32)
        norm = np.linalg.norm(arr)
        if norm > 1e-9:  # 0으로 나누기 방지
            arr = arr / norm
        return arr.tolist() # DB 저장을 위해 다시 리스트로 변환
        
    return None

def prepare_image(task):
    img_id, raw_s3_url = task
    try:
        path = raw_s3_url.strip()
        key_path = path.split(f"{BUCKET_NAME}/")[-1] if f"{BUCKET_NAME}/" in path else path.lstrip('/')
        key_path = unquote(key_path)

        # 1. S3에서 이미지 로드
        obj = s3_client.get_object(Bucket=BUCKET_NAME, Key=key_path)
        img = Image.open(io.BytesIO(obj['Body'].read())).convert('RGB')
        
        # 2. Letterbox Padding 로직 (128 회색 채우기)
        target_size = (224, 224)
        padding_color = (128, 128, 128)
        
        # 원본 비율 유지하며 리사이즈
        img.thumbnail(target_size, Image.Resampling.LANCZOS)
        
        # 새 회색 도화지 생성
        new_img = Image.new("RGB", target_size, padding_color)
        
        # 중앙에 배치
        upper_left = (
            (target_size[0] - img.size[0]) // 2,
            (target_size[1] - img.size[1]) // 2
        )
        new_img.paste(img, upper_left)
        
        # 3. Base64 직렬화
        buf = io.BytesIO()
        new_img.save(buf, format="JPEG", quality=75) # 패딩 들어가면 퀄리티 살짝 올리는게 좋음
        return (img_id, f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}", "READY")
        
    except Exception as e:
        # print(f"Error prepping {img_id}: {e}") # 필요 시 에러 확인용
        return (img_id, None, "ERROR")

def run_batch_pipeline(db_params):
    global total_success, skipped_ids
    
    conn = psycopg2.connect(**db_params)
    try:
        with conn.cursor() as cur:
            # 실패한 ID들을 제외하고 서울 지역 누락 데이터 조회
            query = f"""
                SELECT img.id, img.s3_url FROM item_images img 
                LEFT JOIN item_image_embeddings emb ON img.id = emb.image_id 
                WHERE emb.image_id IS NULL AND img.s3_url LIKE '%%/seoul/%%'
            """
            
            params = []
            
            if skipped_ids:
                id_list = list(skipped_ids)
                placeholders = ', '.join(['%s'] * len(id_list))
                query += f" AND img.id NOT IN ({placeholders})"
                params.extend(id_list)
            
            query += f" LIMIT {DB_FETCH_SIZE};"
            
            cur.execute(query, params)
            tasks = cur.fetchall()
    finally:
        conn.close()
        
    if not tasks: return False

    print(f"\n📦 배치 로드: {len(tasks)}개")

    with ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
        prepped = list(executor.map(prepare_image, tasks))
    
    valid_tasks = [t for t in prepped if t[2] == "READY"]
    
    # S3 통과 못한 놈들은 메모리에 박제해서 무한 루프 방지
    for t in prepped:
        if t[2] != "READY":
            skipped_ids.add(t[0])
    
    print(f"🔍 S3 통과: {len(valid_tasks)}/{len(tasks)} (제외 누적: {len(skipped_ids)})")

    if not valid_tasks: return True

    # RunPod API 호출
    headers = {"Authorization": f"Bearer {os.getenv('RUNPOD_API_KEY')}", "Content-Type": "application/json"}
    url = f"https://api.runpod.ai/v2/{os.getenv('RUNPOD_ENDPOINT_ID')}/runsync"

    final_embeddings = []
    for i in range(0, len(valid_tasks), API_BATCH_SIZE):
        chunk = valid_tasks[i:i + API_BATCH_SIZE]
        payload = {"input": {"model": TARGET_MODEL, "input": [c[1] for c in chunk]}}
        
        try:
            res = requests.post(url, json=payload, headers=headers, timeout=180).json()
            if res.get("status") == "COMPLETED":
                items = res.get('output', {}).get('data', []) if isinstance(res.get('output'), dict) else res.get('output', [])
                for idx, out_item in enumerate(items):
                    vector = get_actual_vector(out_item)
                    if vector:
                        final_embeddings.append((chunk[idx][0], str(vector), TARGET_MODEL))
        except Exception as e:
            print(f"❌ API 에러: {e}")

    if final_embeddings:
        with psycopg2.connect(**db_params) as conn:
            with conn.cursor() as ins_cur:
                execute_values(ins_cur, "INSERT INTO item_image_embeddings (image_id, embedding, model_name) VALUES %s", final_embeddings)
        total_success += len(final_embeddings)
        print(f"✅ 성공: {len(final_embeddings)}개 저장 (누적: {total_success})")
    
    return True

def send_discord_report(total_count, duration, status="완료"):
    if not WEBHOOK_URL: return
    current_time = time.strftime('%Y-%m-%d %H:%M:%S')
    payload = {
        "embeds": [{
            "title": f"🚀 임베딩 작업 {status} 보고",
            "color": 3066993 if status == "완료" else 15158332,
            "fields": [
                {"name": "처리 완료", "value": f"{total_count}개", "inline": True},
                {"name": "제외(S3에러)", "value": f"{len(skipped_ids)}개", "inline": True},
                {"name": "소요 시간", "value": f"{duration:.1f}분", "inline": False},
                {"name": "완료 시간", "value": current_time, "inline": False}
            ],
            "footer": {"text": "EC2 Embedding Processor"}
        }]
    }
    requests.post(WEBHOOK_URL, json=payload, timeout=5)

if __name__ == "__main__":
    db_params = {
        'host': os.getenv("DB_HOST"),
        'port': 5432,
        'user': os.getenv("DB_USER"),
        'password': os.getenv("DB_PASSWORD"),
        'database': os.getenv("DB_NAME")
    }
    
    print(f"🚀 [서울 전체 데이터] 임베딩 작업 시작")
    start_time = time.time()
    
    try:
        while run_batch_pipeline(db_params):
            time.sleep(1)
        
        duration_min = (time.time() - start_time) / 60
        send_discord_report(total_success, duration_min, "완료")
        
    except KeyboardInterrupt:
        print("\n🛑 중단됨")
        duration_min = (time.time() - start_time) / 60
        send_discord_report(total_success, duration_min, "강제 중단")

    print(f"📊 최종 결과: {total_success}개 완료 / {len(skipped_ids)}개 스킵")