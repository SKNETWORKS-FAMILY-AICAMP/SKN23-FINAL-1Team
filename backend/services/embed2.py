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
from sshtunnel import SSHTunnelForwarder
from psycopg2.extras import execute_values
from concurrent.futures import ThreadPoolExecutor

load_dotenv()

# [설정]
TARGET_MODEL = "openai/clip-vit-base-patch32"
MAX_THREADS = 5
API_BATCH_SIZE = 100 
DB_FETCH_SIZE = 1000

BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
REGION = os.getenv("AWS_REGION", "ap-northeast-2")

total_success = 0

s3_client = boto3.client('s3', 
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=REGION
)

def get_actual_vector(data):
    """중첩된 JSON 구조를 끝까지 파고들어 숫자 리스트(벡터)를 반환"""
    if isinstance(data, list) and len(data) > 0:
        if isinstance(data[0], (int, float)): return data
        return get_actual_vector(data[0])
    if isinstance(data, dict):
        for key in ['embedding', 'data', 'values', 'embedding_vector']:
            if key in data:
                res = get_actual_vector(data[key])
                if res: return res
        for val in data.values():
            res = get_actual_vector(val)
            if res: return res
    return None

def prepare_image(task):
    img_id, raw_s3_url = task
    try:
        path = raw_s3_url.strip()
        # S3 Key 추출: s3://주소를 제거하고 순수 경로만 획득
        key_path = path.split(f"{BUCKET_NAME}/")[-1] if f"{BUCKET_NAME}/" in path else path.lstrip('/')
        key_path = unquote(key_path)

        obj = s3_client.get_object(Bucket=BUCKET_NAME, Key=key_path)
        img = Image.open(io.BytesIO(obj['Body'].read())).convert('RGB')
        img.thumbnail((224, 224)) 
        
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=60)
        return (img_id, f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}", "READY")
    except Exception as e:
        return (img_id, None, f"ERROR: {str(e)}")

def run_batch_pipeline(db_params):
    global total_success
    conn = psycopg2.connect(**db_params)
    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT img.id, img.s3_url FROM item_images img 
            LEFT JOIN item_image_embeddings emb ON img.id = emb.image_id 
            WHERE emb.image_id IS NULL AND img.s3_url LIKE '%/seoul/%'
            AND img.s3_url LIKE '%2026-04-14%' LIMIT {DB_FETCH_SIZE};
        """)
        tasks = cur.fetchall()
    conn.close()

    if not tasks: 
        print("🏁 처리할 데이터가 없습니다.")
        return False

    print(f"\n📦 배치 로드: {len(tasks)}개")

    with ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
        prepped = list(executor.map(prepare_image, tasks))
    
    valid_tasks = [t for t in prepped if t[2] == "READY"]
    print(f"🔍 S3 통과: {len(valid_tasks)}/{len(tasks)}")

    if not valid_tasks: return True

    headers = {"Authorization": f"Bearer {os.getenv('RUNPOD_API_KEY')}", "Content-Type": "application/json"}
    url = f"https://api.runpod.ai/v2/{os.getenv('RUNPOD_ENDPOINT_ID')}/runsync"

    final_embeddings = []
    for i in range(0, len(valid_tasks), API_BATCH_SIZE):
        chunk = valid_tasks[i:i + API_BATCH_SIZE]
        payload = {"input": {"model": TARGET_MODEL, "input": [c[1] for c in chunk]}}
        
        try:
            res = requests.post(url, json=payload, headers=headers, timeout=180).json()
            if res.get("status") == "COMPLETED":
                output_root = res.get('output', [])
                # Infinity 엔진 특유의 data 키 중첩 해제
                items = output_root.get('data', []) if isinstance(output_root, dict) else output_root

                for idx, out_item in enumerate(items):
                    vector = get_actual_vector(out_item)
                    if vector:
                        final_embeddings.append((chunk[idx][0], str(vector), TARGET_MODEL))
            else:
                print(f"❌ API 실패: {res.get('status')}")
        except Exception as e:
            print(f"❌ 에러: {e}")

    if final_embeddings:
        with psycopg2.connect(**db_params) as conn:
            with conn.cursor() as ins_cur:
                execute_values(ins_cur, "INSERT INTO item_image_embeddings (image_id, embedding, model_name) VALUES %s", final_embeddings)
        total_success += len(final_embeddings)
        print(f"✅ 드디어 성공: {len(final_embeddings)}개 저장 (누적: {total_success})")
    else:
        print("⚠️ 런팟 응답은 성공했으나 벡터 데이터 추출에 실패했습니다.")
    
    return True

def send_discord_final_report(total_count, duration):
    """모든 작업이 종료된 후 최종 보고를 디스코드로 전송"""
    webhook_url = "https://discord.com/api/webhooks/1493441055146643557/szeiOmw9uP1d2SBMJAfg6oBiCxb9Pu4_Ec_dDKIkr8MlB4e1Dem9XC3l-62st82yWreY"
    if not webhook_url:
        print("⚠️ WEBHOOK_URL이 설정되지 않아 디코드 전송을 건너뜁니다.")
        return
    
    # 한국 시간 기준으로 현재 시간 생성
    current_time = time.strftime('%Y-%m-%d %H:%M:%S')
    
    payload = {
        "embeds": [{
            "title": "✅ 임베딩 작업 전체 완료 보고",
            "color": 3066993, # 녹색
            "fields": [
                {"name": "총 처리 개수", "value": f"{total_count}개", "inline": True},
                {"name": "소요 시간", "value": f"{duration:.1f}분", "inline": True},
                {"name": "완료 시간", "value": current_time, "inline": False},
                {"name": "대상 모델", "value": TARGET_MODEL, "inline": False}
            ],
            "footer": {"text": "RunPod 배치 프로세서"}
        }]
    }
    
    try:
        requests.post(webhook_url, json=payload, timeout=5)
        print("📢 디스코드 최종 리포트 전송 완료!")
    except Exception as e:
        print(f"⚠️ 디스코드 전송 실패: {e}")

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
        
        print(f"🚀 [최종 알림 모드] 작업 시작")
        start_time = time.time()
        
        try:
            # 루프가 True를 반환하는 동안 계속 실행 (데이터가 있으면 계속 돎)
            while run_batch_pipeline(db_params):
                time.sleep(1)
            
            # [핵심] 루프가 끝나면(더 이상 데이터가 없으면) 아래 코드가 실행됨
            duration_min = (time.time() - start_time) / 60
            send_discord_final_report(total_success, duration_min)
            
        except KeyboardInterrupt:
            print("\n🛑 사용자에 의해 중단됨")
            duration_min = (time.time() - start_time) / 60
            send_discord_final_report(total_success, duration_min)

        print(f"📊 최종 결과: {total_success}개 완료")