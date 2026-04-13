import os
import psycopg2
import boto3
from pathlib import Path
from PIL import Image
from urllib.parse import urlparse
from sentence_transformers import SentenceTransformer
from sshtunnel import SSHTunnelForwarder
from dotenv import load_dotenv

# 1. 경로 설정
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent.parent 
env_path = project_root / '.env'
load_dotenv(dotenv_path=env_path)

# 폴더 경로 설정
CREATE_IMAGE_DIR = project_root / "backend" / "create_image"
SAVE_DIR = current_file.parent / "similarity_image"

MODEL_NAME = 'clip-ViT-B-32'
TOP_K = 4

def get_latest_image(directory):
    """지정된 폴더에서 가장 최근에 수정된 이미지 파일을 반환"""
    # 지원하는 이미지 확장자 목록
    extensions = ("*.png", "*.jpg", "*.jpeg", "*.webp")
    image_files = []
    for ext in extensions:
        image_files.extend(directory.glob(ext))
    
    if not image_files:
        return None
    
    # 수정 시간(mtime) 기준으로 정렬하여 가장 최신 파일 반환
    return max(image_files, key=lambda f: f.stat().st_mtime)

def download_from_s3(s3_url, rank, score):
    """S3 URL에서 이미지를 다운로드하여 저장"""
    try:
        s3 = boto3.client('s3', 
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=os.getenv("AWS_REGION")
        )
        
        if not SAVE_DIR.exists():
            SAVE_DIR.mkdir(parents=True, exist_ok=True)

        parsed = urlparse(s3_url)
        bucket = parsed.netloc.split('.')[0]
        key = parsed.path.lstrip('/')
        
        file_ext = Path(key).suffix or ".jpg"
        save_path = SAVE_DIR / f"rank_{rank}_{score:.4f}{file_ext}"
        
        s3.download_file(bucket, key, str(save_path))
        return save_path
    except Exception as e:
        print(f"   ❌ 다운로드 실패: {e}")
        return None

def run_similarity_test():
    ec2_host = os.getenv("EC2_HOST")
    
    # 폴더 내 최신 이미지 자동 검색
    test_image_path = get_latest_image(CREATE_IMAGE_DIR)
    
    if not ec2_host or not test_image_path:
        print(f"❌ 설정 오류 또는 이미지가 폴더에 없습니다: {CREATE_IMAGE_DIR}")
        return

    print(f"🎯 테스트 대상 이미지: {test_image_path.name}")
    
    # 2. 모델 로드 및 벡터 변환
    print(f"⏳ 모델 로드 및 이미지 분석 중...")
    model = SentenceTransformer(MODEL_NAME)
    img = Image.open(test_image_path).convert('RGB')
    test_vector = model.encode(img)

    # 3. DB 검색 및 결과 처리
    print(f"🔗 DB 접속 및 유사도 검색 중...")
    try:
        with SSHTunnelForwarder(
            (ec2_host, 22),
            ssh_username=os.getenv("EC2_USER", "ubuntu"),
            ssh_pkey=os.getenv("SSH_KEY_PATH"),
            remote_bind_address=(os.getenv("DB_HOST"), 5432),
            local_bind_address=('127.0.0.1', 5433)
        ) as server:
            
            db_params = {
                'host': '127.0.0.1', 'port': server.local_bind_port,
                'user': os.getenv("DB_USER"), 'password': os.getenv("DB_PASSWORD"),
                'database': os.getenv("DB_NAME")
            }

            with psycopg2.connect(**db_params) as conn:
                with conn.cursor() as cur:
                    query = """
                        SELECT img.s3_url, 1 - (emb.embedding <=> %s::vector) AS similarity
                        FROM item_images img
                        JOIN item_image_embeddings emb ON img.id = emb.image_id
                        ORDER BY similarity DESC LIMIT %s;
                    """
                    vector_str = "[" + ",".join(map(str, test_vector)) + "]"
                    cur.execute(query, (vector_str, TOP_K))
                    results = cur.fetchall()
                    
                    print(f"\n✨ 검색 완료! {SAVE_DIR.name} 폴더에 저장을 시작합니다.")
                    print("="*80)
                    for i, (url, score) in enumerate(results, 1):
                        print(f"[{i}] 유사도: {score:.4f} | 다운로드 중...")
                        saved_path = download_from_s3(url, i, score)
                        if saved_path:
                            print(f"    -> 저장완료: {saved_path.name}")
                    print("="*80)

    except Exception as e:
        print(f"❌ 에러 발생: {e}")

if __name__ == "__main__":
    run_similarity_test()