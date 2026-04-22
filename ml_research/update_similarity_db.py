import psycopg2
import os
from dotenv import load_dotenv
from psycopg2_db_connection import psycopg2_db_connection

def update_similarity_in_db(text_embedding_list: list, update_query: str):
    """
    텍스트 임베딩(리스트)을 받아서, 
    DB에 있는 모든 이미지의 코사인 유사도를 계산하고 업데이트하는 쿼리
    """

    print("DB 연결 중...")
    conn = psycopg2_db_connection()
    cur = conn.cursor()

    try:
        embedding_str = '[' + ','.join(map(str, text_embedding_list)) + ']'
        print("DB에서 내적 기반 유사도 계산 및 업데이트 중...")
        update_query = update_query
        cur.execute(update_query, (embedding_str,))
        conn.commit()
        
        updated_rows = cur.rowcount
        print(f"완료! 총 {updated_rows}개의 이미지 점수가 업데이트됐어.")

    except Exception as e:
        print(f"쿼리 날리다가 에러 났어: {e}")
        conn.rollback()
    
    finally:
        cur.close()
        conn.close()

