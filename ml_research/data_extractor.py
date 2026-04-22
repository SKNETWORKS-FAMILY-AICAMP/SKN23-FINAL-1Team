import os
import pandas as pd
from zoneinfo import ZoneInfo
from datetime import datetime
from db_connection import db_connection

def csv_extractor(query: str, ):
    engine = db_connection()
    try:
        with engine.connect() as connection:
            print("DB 연결 성공")
    except Exception as e:
        print(f"DB 연결 실패: {e}")
        engine.dispose()
        return
    
    if not os.path.exists("data"):
        os.mkdir("data")
    
    KST = ZoneInfo("Asia/Seoul")
    file_name = f"raw_data/items_data_{datetime.now(KST).strftime('%Y-%m-%d')}.csv"
    
    df = pd.read_sql(query, engine)
    df.to_csv(file_name, index = False, encoding = "utf-8-sig")
    print("csv 파일 작성 완료")
    engine.dispose()

def data_extractor():
    "CSV 추출용 코드입니다."
    query = """
    WITH room_agg AS (
        SELECT
            img.item_id,
            AVG(emb.normalized_room_score) as room_quality_score
        FROM item_images img
        JOIN item_image_embeddings emb ON img.id = emb.image_id
        WHERE emb.room_score >= 0.24
        GROUP BY img.item_id
    ),
    bath_agg AS (
        SELECT
            img.item_id,
            emb.normalized_bathroom_score as bath_clean_score
        FROM item_images img
        JOIN item_image_embeddings emb ON img.id = emb.image_id
        WHERE emb.is_bathroom = TRUE
    )
    SELECT
        i.address, i.deposit, i.rent, i.manage_cost, i.service_type, i.room_type,
        i.floor, i.all_floors, i.area_m2, i.first_crawled_at,
        t.has_parking, t.has_elevator, t.bathroom_count, t.room_direction,
        t.movein_date, t.approve_date, t.has_air_con, t.has_fridge, t.has_washer,
        t.has_gas_stove, t.has_induction, t.has_microwave, t.has_desk, t.has_bed,
        t.has_closet, t.has_shoe_rack, t.dist_subway, t.dist_pharmacy, t.dist_conv,
        t.dist_bus, t.dist_mart, t.dist_laundry, t.dist_cafe, t.is_coupang,
        t.is_ssg, t.is_marketkurly, t.is_baemin, t.is_yogiyo, t.is_subway_area,
        t.is_convenient_area, t.is_park_area, t.is_school_area, t.has_bookcase,
        t.has_sink,
        r.room_quality_score,
        b.bath_clean_score
    FROM items i
    INNER JOIN item_features t ON i.item_id = t.item_id
    LEFT JOIN room_agg r ON i.item_id = r.item_id
    LEFT JOIN bath_agg b ON i.item_id = b.item_id;
    """
    csv_extractor(query = query)

if __name__ == "__main__":
    data_extractor()