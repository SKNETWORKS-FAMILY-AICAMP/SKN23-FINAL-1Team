import psycopg2
import os
from dotenv import load_dotenv

# .env 파일에서 DB 정보 가져오기 (네 프로젝트 구조에 맞췄어)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(ROOT_DIR, ".env"))

def get_db_connection():
    RUN_ENV = os.getenv("ENV", "SERVER")
    if RUN_ENV == "LOCAL":
        return psycopg2.connect(
            host="localhost",
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            port="15432"
        )
    
    else:
        return psycopg2.connect(
            host=os.getenv("DB_HOST"),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            port=os.getenv("DB_PORT")
        )

def update_similarity_in_db(text_embedding_list):
    """
    텍스트 임베딩(리스트)을 받아서, 
    DB에 있는 모든 이미지의 코사인 유사도를 계산하고 업데이트하는 쿼리
    """
    print("DB 연결 중...")
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # 1. 만약 similarity_score 컬럼이 없다면 추가해주는 친절함 (에러 안 나게 무시)
        cur.execute("ALTER TABLE item_image_embeddings ADD COLUMN IF NOT EXISTS similarity_score FLOAT;")

        # 2. 텍스트 임베딩 배열을 PostgreSQL이 알아먹는 포맷 문자열로 변환 ('[0.123, -0.456, ...]')
        # 파이썬 리스트를 문자열로 바꿈
        embedding_str = '[' + ','.join(map(str, text_embedding_list)) + ']'

        # 3. 핵심 쿼리! (정규화된 벡터를 위한 내적 연산자 '<#>' 활용)
        # PostgreSQL의 pgvector에서 '<#>' 연산자는 -(vector1 . vector2)를 반환해.
        # 즉, 우리가 원하는 유사도(내적) = -(image_embedding <#> %s::vector)
        print("DB에서 내적 기반 유사도 계산 및 업데이트 중... (정규화 재활용!)")
        
        # 'image_embedding' 부분을 네가 실제 임베딩을 저장해둔 컬럼 이름으로 바꿔야 해!
        update_query = """
            UPDATE item_image_embeddings
            SET similarity_score = -(embedding <#> %s::vector)
            WHERE embedding IS NOT NULL;
        """
        
        # 쿼리 실행
        cur.execute(update_query, (embedding_str,))
        
        # 변경사항 저장
        conn.commit()
        
        # 몇 개나 업데이트됐는지 확인
        updated_rows = cur.rowcount
        print(f"완료! 총 {updated_rows}개의 이미지 점수가 업데이트됐어.")

    except Exception as e:
        print(f"하... 쿼리 날리다가 에러 났어: {e}")
        print("혹시 DB에 pgvector 익스텐션 안 깔려 있는 거 아냐? 'CREATE EXTENSION vector;' 실행했어?")
        conn.rollback()
    
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    from extract_embedding import main as extract_embedding_main
    # dummy_text_embedding = [0.01] * 512 
    update_similarity_in_db(extract_embedding_main())
