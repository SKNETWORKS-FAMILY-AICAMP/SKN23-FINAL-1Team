import os
import sys
import requests
import base64
import boto3
from io import BytesIO
from PIL import Image, ImageDraw
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# 프로젝트 루트 경로 설정
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

try:
    from services.embedding_service import EmbeddingService
except ImportError:
    sys.path.append(os.path.join(project_root, "backend", "services"))
    from embedding_service import EmbeddingService

load_dotenv(dotenv_path=os.path.join(project_root, ".env"))

# 환경 변수
DB_HOST = "localhost" 
DB_PORT = "15432"     
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
S3_BUCKET = os.getenv("S3_BUCKET")
AWS_REGION = os.getenv("AWS_REGION", "ap-northeast-2")

s3_client = boto3.client('s3', region_name=AWS_REGION)

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_s3_presigned_url(s3_url, expiration=300):
    if not s3_url or not s3_url.startswith("s3://"):
        return s3_url
    try:
        path = s3_url.replace(f"s3://{S3_BUCKET}/", "")
        return s3_client.generate_presigned_url('get_object', Params={'Bucket': S3_BUCKET, 'Key': path}, ExpiresIn=expiration)
    except Exception: return None

def center_crop_to_square(image):
    """이미지의 중앙을 기준으로 정방형으로 크롭합니다."""
    width, height = image.size
    new_size = min(width, height)
    
    left = (width - new_size) / 2
    top = (height - new_size) / 2
    right = (width + new_size) / 2
    bottom = (height + new_size) / 2
    
    return image.crop((left, top, right, bottom))

def load_and_preprocess_image(file_path):
    """로컬 이미지를 로드하고 정방형으로 크롭한 뒤 바이트 데이터를 반환합니다."""
    print(f"--- 이미지 로드 및 전처리 시작: {file_path} ---")
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")
        
    img = Image.open(file_path).convert("RGB")
    
    # 1. 정방형 크롭
    img = center_crop_to_square(img)
    print(f"정방형 크롭 완료 (Size: {img.size})")
    
    # 2. 임베딩 서비스에 보낼 바이트 데이터 생성
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_bytes = img_byte_arr.getvalue()
    
    return img, img_bytes

def search_top_n_similar_rooms(query_embedding, n=4):
    """중복 제거(DISTINCT ON) 쿼리를 적용한 유사 매물 검색"""
    print(f"--- DB에서 중복 제거 후 상위 {n}개 유사 매물 검색 중 ---")
    session = SessionLocal()
    results = []
    try:
        vector_str = str(query_embedding)
        sql = text("""
            SELECT item_id, s3_url, similarity
            FROM (
                SELECT DISTINCT ON (emb.embedding::text)
                       i.item_id, 
                       img.s3_url, 
                       1 - (emb.embedding <=> :vector) as similarity
                FROM public.item_image_embeddings emb
                JOIN public.item_images img ON emb.image_id = img.id
                JOIN public.items i ON img.item_id = i.item_id
                WHERE img.is_main = True
                ORDER BY emb.embedding::text, emb.embedding <=> :vector
            ) sub
            ORDER BY similarity DESC
            LIMIT :limit
        """)
        
        db_results = session.execute(sql, {"vector": vector_str, "limit": n}).fetchall()
        
        for res in db_results:
            item_id, s3_url, similarity = res
            signed_url = get_s3_presigned_url(s3_url)
            if signed_url:
                try:
                    img_response = requests.get(signed_url, timeout=5)
                    img_response.raise_for_status()
                    results.append(Image.open(BytesIO(img_response.content)))
                    print(f"매물 발견! (ID: {item_id}, 유사도: {similarity:.4f})")
                except Exception as e:
                    print(f"이미지 다운로드 실패: {e}")
        return results
    finally:
        session.close()

def combine_images_grid(query_img, result_imgs, output_path="upload_search_result.png"):
    print(f"--- 최종 결과 합성 중: {output_path} ---")
    canvas = Image.new('RGB', (2048, 1024), color=(255, 255, 255))
    
    # 크롭된 쿼리 이미지 배치
    query_img = query_img.resize((1024, 1024))
    canvas.paste(query_img, (0, 0))
    
    # 결과 그리드 배치
    for i in range(4):
        res_img = result_imgs[i].resize((512, 512)) if i < len(result_imgs) else Image.new('RGB', (512, 512), color=(240, 240, 240))
        canvas.paste(res_img, (1024 + (i % 2) * 512, (i // 2) * 512))
        
    draw = ImageDraw.Draw(canvas)
    draw.line([(1024, 0), (1024, 1024)], fill=(0, 0, 0), width=5)
    canvas.save(output_path)
    print(f"성공! 업로드 검색 결과 파일: {os.path.abspath(output_path)}")

if __name__ == "__main__":
    try:
        # 테스트할 이미지 경로 (여기만 바꿔!)
        target_image_path = "room.png" 
        
        # 1. 이미지 로드 및 정방형 크롭
        upload_img, img_bytes = load_and_preprocess_image(target_image_path)
        
        # 2. 크롭된 이미지의 임베딩 추출
        embedding = EmbeddingService.get_image_embedding(img_bytes)
        
        if embedding:
            # 3. 유사 매물 검색
            top4 = search_top_n_similar_rooms(embedding, n=4)
            
            # 4. 최종 합성
            combine_images_grid(upload_img, top4)
            
    except Exception as e:
        print(f"에러: {e}")
        import traceback
        traceback.print_exc()
