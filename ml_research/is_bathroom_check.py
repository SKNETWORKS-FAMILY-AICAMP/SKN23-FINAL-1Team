import psycopg2
import os
from dotenv import load_dotenv

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

def update_bathroom_score(text_embedding_list):
    """
    텍스트 임베딩(리스트)을 받아서, 
    DB에 있는 이미지가 화장실의 사진인지 아닌지 점수를 매기는 함수.
    """
    print("DB 연결 중...")
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("ALTER TABLE item_image_embeddings ADD COLUMN IF NOT EXISTS bathroom_score FLOAT;")
        embedding_str = '[' + ','.join(map(str, text_embedding_list)) + ']'

        print("DB에서 내적 기반 유사도 계산 및 업데이트 중... (정규화 재활용!)")
        
        update_query = """
            UPDATE item_image_embeddings
            SET bathroom_score = -(embedding <#> %s::vector)
            WHERE embedding IS NOT NULL;
        """
        cur.execute(update_query, (embedding_str,))
        conn.commit()
        
        updated_rows = cur.rowcount
        print(f"완료! 총 {updated_rows}개의 이미지 점수가 업데이트됐어.")

    except Exception as e:
        print(f"하... 쿼리 날리다가 에러 났어: {e}")
        conn.rollback()
    
    finally:
        cur.close()
        conn.close()

def update_bathroom_labels(threshold=0.263):
    """
    매물별로 가장 높은 bathroom_score를 가진 사진 1장을 
    지정된 임계값 이상인 경우에만 is_bathroom=True로 라벨링합니다.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        print(f"🚀 [Threshold: {threshold}] 화장실 라벨링 작업을 시작합니다...")

        # 1. 컬럼 존재 여부 확인 및 추가
        cur.execute("ALTER TABLE item_image_embeddings ADD COLUMN IF NOT EXISTS is_bathroom BOOLEAN DEFAULT FALSE;")
        conn.commit()

        # 2. 모든 라벨 초기화 (중복 방지 및 최신화)
        print("🔄 기존 is_bathroom 라벨 초기화 중...")
        cur.execute("UPDATE item_image_embeddings SET is_bathroom = FALSE;")
        
        # 3. 매물별 최고 점수 사진 1장씩 선별하여 업데이트
        # 로직: 매물별로 bathroom_score가 가장 높은 사진을 고르되, 그 점수가 threshold 이상이어야 함.
        print("✨ 매물별 대표 화장실 사진 선별 중 (이 작업은 시간이 좀 걸릴 수 있어)...")
        update_query = """
            UPDATE item_image_embeddings
            SET is_bathroom = TRUE
            WHERE id IN (
                SELECT id FROM (
                    SELECT DISTINCT ON (img.item_id) 
                        emb.id
                    FROM item_images img
                    JOIN item_image_embeddings emb ON img.id = emb.image_id
                    WHERE emb.bathroom_score >= %s
                    ORDER BY img.item_id, emb.bathroom_score DESC
                ) sub
            );
        """
        cur.execute(update_query, (threshold,))
        
        # 4. 결과 통계 확인
        cur.execute("SELECT count(*) FROM item_image_embeddings WHERE is_bathroom = TRUE;")
        success_count = cur.fetchone()[0]
        
        cur.execute("SELECT count(DISTINCT item_id) FROM item_images;")
        total_items = cur.fetchone()[0]
        
        conn.commit()
        print("-" * 50)
        print(f"✅ 라벨링 완료!")
        print(f"✅ 화장실 대표 사진 확보된 매물: {success_count}개")
        print(f"✅ 전체 매물 중 비율: {(success_count/total_items)*100:.2f}%")
        print("-" * 50)
        
    except Exception as e:
        print(f"❌ 하... 작업하다가 사고 쳤어: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

def is_bathroom_check():
    from extract_embedding import main as extract_embedding_main
    text_list = ["A photo of a toilet interior"]
    update_bathroom_score(extract_embedding_main(text_list))
    update_bathroom_labels(threshold=0.263)
    
if __name__ == "__main__":
    is_bathroom_check()
