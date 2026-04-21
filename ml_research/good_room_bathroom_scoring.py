import psycopg2
import os
from dotenv import load_dotenv
from psycopg2_db_connection import psycopg2_db_connection
from update_similarity_db import update_similarity_in_db
from extract_embedding import main as extract_embedding_main

def calculate_normalized_score():
    print("📈 정규화 점수(P / P+N) 계산 및 업데이트 중...")
    conn = psycopg2_db_connection()
    cur = conn.cursor()

    try:
        # 1. 방 상태 정규화 (P_room / (P_room + N_room))
        # 분모가 0이 되는 걸 방지하기 위해 1e-9를 더해주는 센스!
        room_sql = """
            UPDATE item_image_embeddings
            SET normalized_room_score =
                GREATEST(good_room_score, 0) / (GREATEST(good_room_score, 0) + GREATEST(bad_room_score, 0) + 1e-9)
            WHERE is_room = TRUE;
        """
   
        bath_sql = """
            UPDATE item_image_embeddings
            SET normalized_bathroom_score =
                GREATEST(clean_bathroom_score, 0) / (GREATEST(clean_bathroom_score, 0) + GREATEST(dirty_bathroom_score, 0) + 1e-9)
            WHERE is_bathroom = TRUE;
        """

        print("🏠 방 데이터 정규화 중...")
        cur.execute(room_sql)

        print("🚿 화장실 데이터 정규화 중...")
        cur.execute(bath_sql)

        conn.commit()
        print("🎉 정규화 업데이트 완료!")
   
    except Exception as e:
           print(f"❌ 정규화 도중 에러 났어: {e}")
           conn.rollback()
    finally:
        cur.close()
        conn.close()

def main():
    query_list = [
        {"query" : "a clean, bright, and well-maintained studio apartment room interior, modern furniture, tidy and organized",
         "update_query" : """
            UPDATE item_image_embeddings
            SET good_room_score = -(embedding <#> %s::vector)
            WHERE is_room = TRUE;
        """},

        {"query" : "a messy, dark, cluttered, and poorly maintained room, old furniture, dirty floor",
         "update_query" : """
            UPDATE item_image_embeddings
            SET bad_room_score = -(embedding <#> %s::vector)
            WHERE is_room = TRUE;
        """},

        {"query" : "a sparkling clean and hygienic bathroom, polished white tiles, shiny faucet, modern and renovated bathroom interior",
         "update_query" : """
            UPDATE item_image_embeddings
            SET clean_bathroom_score = -(embedding <#> %s::vector)
            WHERE is_bathroom = TRUE;
        """},

        {"query" : "a dirty and moldy bathroom, yellowish tiles, rusty faucet, outdated and unhygienic bathroom interior",
         "update_query" : """
            UPDATE item_image_embeddings
            SET dirty_bathroom_score = -(embedding <#> %s::vector)
            WHERE is_bathroom = TRUE;
        """},
    ]

    for query in query_list:
        update_similarity_in_db(extract_embedding_main(query["query"]), query["update_query"])

    calculate_normalized_score()

if __name__ == "__main__":
    #main()
    calculate_normalized_score()

