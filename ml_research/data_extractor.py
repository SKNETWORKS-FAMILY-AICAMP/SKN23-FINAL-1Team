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

if __name__ == "__main__":
    "CSV 추출용 코드입니다."
    query = """select address, deposit, rent, manage_cost, service_type, room_type, floor, all_floors, area_m2, 
                has_parking, has_elevator, bathroom_count, room_direction, movein_date, approve_date, has_air_con, 
                has_fridge, has_washer, has_gas_stove, has_induction, has_microwave, has_desk, has_bed, has_closet, 
                has_shoe_rack, dist_subway, dist_pharmacy, dist_conv, dist_bus, dist_mart, dist_laundry, dist_cafe, 
                is_coupang, is_ssg, is_marketkurly, is_baemin, is_yogiyo, is_subway_area, is_convenient_area, 
                is_park_area, is_school_area, has_bookcase, has_sink
                from items i
                inner join item_features t
                on i.item_id = t.item_id;"""
    csv_extractor(query = query)