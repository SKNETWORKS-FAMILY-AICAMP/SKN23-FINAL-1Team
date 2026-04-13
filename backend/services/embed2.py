import os
import io
import time
import base64
import requests
import psycopg2
import boto3
from PIL import Image
from urllib.parse import urlparse
from dotenv import load_dotenv
from sshtunnel import SSHTunnelForwarder
from botocore.config import Config
from concurrent.futures import ThreadPoolExecutor

load_dotenv()

# [설정] 모델 및 병렬 수
TARGET_MODEL = "openai/clip-vit-base-patch32"
MAX_WORKERS = 5  # 서버리스 제한 반영

# S3 설정
s3_config = Config(retries={'max_attempts': 3}, connect_timeout=10, read_timeout=10, max_pool_connections=20)
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION", "ap-northeast-2"),
    config=s3_config
)

def get_actual_vector(data):
    """중첩 구조에서 512차원 숫자 리스트만 추출"""
    if isinstance(data, list) and len(data) > 0:
        if isinstance(data[0], (int, float)): return data
        for item in data:
            res = get_actual_vector(item)
            if res: return res
    if isinstance(data, dict):
        if 'embedding' in data: return get_actual_vector(data['embedding'])
        for val in data.values():
            res = get_actual_vector(val)
            if res: return res
    return None

def process_single_image(task, db_params):
    img_id, s3_url = task
    try:
        # 1. S3 이미지 로드
        parsed = urlparse(s3_url)
        bucket, key = parsed.netloc, parsed.path.lstrip('/')
        obj = s3_client.get_object(Bucket=bucket, Key=key)
        img_bytes = obj['Body'].read()

        # 2. 전처리
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        img.thumbnail((224, 224))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=50)
        img_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')

        # 3. RunPod 요청
        headers = {"Authorization": f"Bearer {os.getenv('RUNPOD_API_KEY')}", "Content-Type": "application/json"}
        payload = {"input": {"model": TARGET_MODEL, "input": f"data:image/jpeg;base64,{img_b64}"}}
        
        run_res = requests.post(
            f"https://api.runpod.ai/v2/{os.getenv('RUNPOD_ENDPOINT_ID')}/run",
            json=payload, headers=headers, timeout=20
        ).json()
        
        job_id = run_res.get("id")
        if not job_id: return f"❌ ID {img_id}: Job 생성 실패"

        # 4. 결과 대기 (Polling)
        actual_vector = None
        for _ in range(40):
            status_res = requests.get(
                f"https://api.runpod.ai/v2/{os.getenv('RUNPOD_ENDPOINT_ID')}/status/{job_id}",
                headers=headers, timeout=10
            ).json()
            if status_res.get("status") == "COMPLETED":
                actual_vector = get_actual_vector(status_res.get('output'))
                break
            time.sleep(0.5)

        # 5. DB 저장 (순정 512차원)
        if actual_vector:
            # 💡 패딩 없이 그대로 저장
            with psycopg2.connect(**db_params) as conn:
                with conn.cursor() as ins_cur:
                    vector_str = f"[{','.join(map(str, actual_vector))}]"
                    query = """
                        INSERT INTO item_image_embeddings (image_id, embedding, model_name) 
                        VALUES (%s, %s::vector, %s)
                    """
                    ins_cur.execute(query, (img_id, vector_str, TARGET_MODEL))
            return f"✅ ID {img_id} 저장 성공 (512 dim)"
        
        return f"⚠️ ID {img_id} 벡터 추출 실패"

    except Exception as e:
        return f"❌ ID {img_id} 에러: {str(e)}"

def run_batch_pipeline():
    with SSHTunnelForwarder(
        (os.getenv("EC2_HOST"), 22),
        ssh_username=os.getenv("EC2_USER", "ubuntu"),
        ssh_pkey=os.getenv("SSH_KEY_PATH"),
        remote_bind_address=(os.getenv("DB_HOST"), 5432),
        local_bind_address=('127.0.0.1', 5433),
        set_keepalive=60
    ) as server:
        db_params = {
            'host': '127.0.0.1', 'port': server.local_bind_port,
            'user': os.getenv("DB_USER"), 'password': os.getenv("DB_PASSWORD"), 
            'database': os.getenv("DB_NAME"), 'connect_timeout': 10
        }

        # 미작업 데이터 조회
        conn = psycopg2.connect(**db_params)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT img.id, img.s3_url FROM item_images img 
                LEFT JOIN item_image_embeddings emb ON img.id = emb.image_id 
                WHERE emb.image_id IS NULL;
            """)
            tasks = cur.fetchall()
        conn.close()

        print(f"🚀 512차원 순정 배치 시작 (Threads: {MAX_WORKERS}, Tasks: {len(tasks)})")

        if not tasks:
            print("✨ 작업할 데이터가 없습니다.")
            return

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            for res in executor.map(lambda t: process_single_image(t, db_params), tasks):
                print(res)

if __name__ == "__main__":
    run_batch_pipeline()