import psycopg2
import os
from dotenv import load_dotenv
from psycopg2_db_connection import psycopg2_db_connection

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(ROOT_DIR, ".env"))

def update_room_score(text_embedding_list):
    """
    텍스트 임베딩(리스트)을 받아서, 
    DB에 있는 이미지가 방의 사진인지 아닌지 점수를 매기는 함수.
    """
    print("DB 연결 중...")
    conn = psycopg2_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("ALTER TABLE item_image_embeddings ADD COLUMN IF NOT EXISTS room_score FLOAT;")
        embedding_str = '[' + ','.join(map(str, text_embedding_list)) + ']'

        print("DB에서 내적 기반 유사도 계산 및 업데이트 중... (정규화 재활용!)")
        
        update_query = """
            UPDATE item_image_embeddings
            SET room_score = -(embedding <#> %s::vector)
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

def update_room_labels(threshold=0.225):
    """
    매물별로 가장 높은 room_score를 가진 사진을
    지정된 임계값 이상인 경우에만 is_room=True로 라벨링합니다.
    """
    conn = psycopg2_db_connection()
    cur = conn.cursor()
    
    try:
        print(f"🚀 [Threshold: {threshold}] 방 라벨링 작업을 시작합니다...")

        # 1. 컬럼 존재 여부 확인 및 추가
        cur.execute("ALTER TABLE item_image_embeddings ADD COLUMN IF NOT EXISTS is_room BOOLEAN DEFAULT FALSE;")
        conn.commit()

        # 2. 모든 라벨 초기화 (중복 방지 및 최신화)
        print("🔄 기존 is_room 라벨 초기화 중...")
        cur.execute("UPDATE item_image_embeddings SET is_room = FALSE;")
        
        # 3. 임계값 이상의 사진을 방 사진으로 취급
        print("방 사진 골라내는 중")
        update_query = """
            UPDATE item_image_embeddings
            SET is_room = TRUE
            WHERE room_score >= %s
            and is_bathroom = FALSE;
        """
        cur.execute(update_query, (threshold,))
        
        # 4. 결과 통계 확인
        cur.execute("SELECT count(*) FROM item_image_embeddings WHERE is_room = TRUE;")
        success_count = cur.fetchone()[0]
        
        conn.commit()
        print("-" * 50)
        print(f"✅ 라벨링 완료!")
        print(f"✅ 방 사진 확보된 매물: {success_count}개")
        print("-" * 50)
        
    except Exception as e:
        print(f"❌ 하... 작업하다가 사고 쳤어: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

def is_room_check():
    from extract_embedding import main as extract_embedding_main
    text = "A photo of a room"
    update_room_score(extract_embedding_main(text))
    update_room_labels(threshold=0.225)

if __name__ == "__main__":
    is_room_check()
