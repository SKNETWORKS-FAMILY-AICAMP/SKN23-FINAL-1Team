import os
import io
import time
import base64
import requests
import psycopg2
import textwrap
from psycopg2.extras import execute_values
import boto3
from PIL import Image
from urllib.parse import urlparse, unquote
from dotenv import load_dotenv
from sshtunnel import SSHTunnelForwarder
from botocore.config import Config
from concurrent.futures import ThreadPoolExecutor

load_dotenv()

# [핵심 설정]
TARGET_MODEL = "openai/clip-vit-base-patch32"
MAX_WORKERS = 5 
BATCH_SIZE = 5000  # 한 번에 가져올 단위 (메모리 안전을 위해 5000 유지 권장)
WEBHOOK_URL = "https://discord.com/api/webhooks/1493119571241078854/I4TiIyp9p83eUZDmCUBOdYOyWqMjbiKY-APobs2coPGSAMtBEQOmFmncbPIYR_z_xfMs"

# S3 클라이언트 설정
s3_config = Config(retries={'max_attempts': 3}, connect_timeout=5, read_timeout=5, max_pool_connections=50)
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION", "ap-northeast-2"),
    config=s3_config
)

def get_actual_vector(data):
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

def process_single_image(task):
    img_id, s3_url = task
    try:
        parsed = urlparse(s3_url)
        bucket = parsed.netloc.split('.')[0]
        key = unquote(parsed.path.lstrip('/'))

        try:
            obj = s3_client.get_object(Bucket=bucket, Key=key)
            img_bytes = obj['Body'].read()
        except s3_client.exceptions.NoSuchKey:
            return (img_id, None, "SKIP_S3_MISSING")

        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        img.thumbnail((224, 224))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=50)
        img_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')

        headers = {"Authorization": f"Bearer {os.getenv('RUNPOD_API_KEY')}", "Content-Type": "application/json"}
        payload = {"input": {"model": TARGET_MODEL, "input": f"data:image/jpeg;base64,{img_b64}"}}
        
        res = requests.post(
            f"https://api.runpod.ai/v2/{os.getenv('RUNPOD_ENDPOINT_ID')}/runsync",
            json=payload, headers=headers, timeout=65
        ).json()
        
        if res.get("status") == "COMPLETED":
            vector = get_actual_vector(res.get('output'))
            if vector: return (img_id, vector, "SUCCESS")
        
        return (img_id, None, f"FAIL_{res.get('status')}")
    except Exception as e:
        return (img_id, None, str(e))

def run_batch_pipeline(db_params):
    """한 배치를 처리하고, 다음 작업이 더 있는지(True/False) 반환합니다."""
    # 1. 미작업 데이터 조회
    conn = psycopg2.connect(**db_params)
    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT img.id, img.s3_url FROM item_images img 
            LEFT JOIN item_image_embeddings emb ON img.id = emb.image_id 
            WHERE emb.image_id IS NULL 
            LIMIT {BATCH_SIZE};
        """)
        tasks = cur.fetchall()
    conn.close()

    if not tasks:
        return False # 더 이상 할 일 없음

    print(f"\n🚀 배치 가동 시작 (Tasks: {len(tasks)}, Workers: {MAX_WORKERS})")
    start_time = time.time()
    results = []
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        for i, res in enumerate(executor.map(process_single_image, tasks)):
            results.append(res)
            if (i + 1) % 100 == 0:
                print(f"⏳ {i + 1}/{len(tasks)} 처리 중... (누적: {time.time()-start_time:.1f}s)")

    valid_data = [(r[0], str(r[1]), TARGET_MODEL) for r in results if r[2] == "SUCCESS"]
    
    # 4. DB 일괄 저장
    if valid_data:
        try:
            with psycopg2.connect(**db_params) as conn:
                with conn.cursor() as ins_cur:
                    query = "INSERT INTO item_image_embeddings (image_id, embedding, model_name) VALUES %s"
                    execute_values(ins_cur, query, valid_data)
                conn.commit()
            print(f"✅ {len(valid_data)}건 DB 저장 완료")
        except Exception as e:
            print(f"❌ DB 저장 오류: {e}")

    # 5. 리포트 생성 및 전송
    duration = time.time() - start_time
    now_str = time.strftime('%H:%M:%S')
    today_str = time.strftime('%Y-%m-%d')
    
    success_count = len(valid_data)
    failed_count = len(tasks) - success_count
    s3_missing_count = sum(1 for r in results if r[2] == "SKIP_S3_MISSING")

    report_text = textwrap.dedent(f"""
        🚀 임베딩 작업 일일 결산
            작업 일시: {now_str}
            완료된 매물 (SUCCESS)
            {success_count}개
            누락/실패/삭제 매물 (FAILED)
            {failed_count}개 (S3 누락: {s3_missing_count}개 포함)
            총 처리된 이미지
            {len(tasks)}개
            기준일
            {today_str}
            소요 시간: {duration:.1f}초
    """).strip()

    if WEBHOOK_URL:
        payload = {"content": f"```\n{report_text}\n```"}
        try:
            requests.post(WEBHOOK_URL, json=payload, timeout=10)
        except: pass

    return True # 작업이 있었으므로 다음 배치를 위해 True 반환

if __name__ == "__main__":
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
            'database': os.getenv("DB_NAME")
        }

        print("🌙 밤샘 자동화 모드 가동...")
        
        while True:
            has_more = run_batch_pipeline(db_params)
            if not has_more:
                print("✨ 모든 매물 처리가 완료되었습니다. 종료합니다.")
                # 마지막 종료 알림
                if WEBHOOK_URL:
                    requests.post(WEBHOOK_URL, json={"content": "🎉 **모든 작업이 완료되어 프로그램이 종료되었습니다!**"})
                break
            
            print("⏳ 다음 배치까지 5초 대기...")
            time.sleep(5)
