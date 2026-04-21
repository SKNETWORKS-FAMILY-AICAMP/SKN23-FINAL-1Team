import requests
import json
import os
from dotenv import load_dotenv
from pathlib import Path

# backend/services/embedding_job.py 기준 2단계 위가 루트
base_dir = Path(__file__).resolve().parent.parent.parent
env_path = base_dir / ".env"

# 경로를 직접 지정해서 로드
load_dotenv(dotenv_path=env_path)
# --- [설정 부분] ---
# 런팟 엔드포인트 ID (런팟 대시보드에서 확인 가능)
ENDPOINT_ID = os.getenv("RUNPOD_ENDPOINT_ID")
# 런팟 API 키 (Settings -> API Keys에서 생성)
API_KEY = os.getenv("RUNPOD_API_KEY")

def run_embedding_job(prefix, batch_size=128):
    url = f"https://api.runpod.ai/v2/{ENDPOINT_ID}/run"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    
    # 핸들러로 전달될 입력 데이터
    payload = {
        "input": {
            "prefix": prefix,
            "batch_size": batch_size
        }
    }
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        response.raise_for_status()
        result = response.json()
        
        print(f"✅ 작업 요청 성공!")
        print(f"🆔 Job ID: {result.get('id')}")
        print(f"📊 상태: {result.get('status')}")
        print(f"📢 디스코드 알림을 기다려주세요.")
        
    except Exception as e:
        print(f"❌ 작업 요청 실패: {e}")

if __name__ == "__main__":
    # 실행할 S3 경로와 배치 사이즈 설정
    TARGET_PREFIX = "zigbang_data/images/seoul/"
    BATCH_SIZE = 256
    
    run_embedding_job(TARGET_PREFIX, BATCH_SIZE)