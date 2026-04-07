import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import re
import os
from datetime import datetime
from dotenv import load_dotenv

# ======================================================
# 1. 환경 설정 및 DB 연결
# ======================================================
# .env 파일이 상위 폴더(프로젝트 루트)에 있으므로 경로 지정!
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(ROOT_DIR, ".env"))

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT")
    )

# ======================================================
# 2. 전처리 유틸리티 함수
# ======================================================

def extract_parking_count(text):
    """주차 대수 텍스트에서 숫자만 추출"""
    if not text or "불가능" in text:
        return 0.0
    match = re.search(r"(\d+(\.\d+)?)", str(text))
    return float(match.group(1)) if match else 0.0

def parse_movein_date(text, crawled_at_str):
    """입주 가능일 텍스트를 DATE 타입으로 변환"""
    if not text:
        return None
    if "즉시" in text:
        try:
            return datetime.fromisoformat(crawled_at_str).date()
        except:
            return datetime.now().date()
    match = re.search(r"(\d{2,4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})", text)
    if match:
        y, m, d = match.groups()
        year = int(y) + 2000 if len(y) == 2 else int(y)
        try:
            return datetime(year, int(m), int(d)).date()
        except:
            return None
    return None

def to_bool(val):
    """Boolean 변환"""
    if isinstance(val, bool): return val
    if str(val).lower() in ('true', '1', 't', 'y', 'yes', '가능'): return True
    return False

# ======================================================
# 3. 메인 로더 함수 (CSV -> DB)
# ======================================================

def load_csv_to_db(csv_path):
    print(f"{os.path.basename(csv_path)} 데이터를 DB로 쏘아 올리는 중...")
    df = pd.read_csv(csv_path)
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        for _, row in df.iterrows():
            item_id = int(row['item_id'])
            crawled_at = row.get('crawled_at', datetime.now().isoformat())
            
            items_sql = """
            INSERT INTO items (
                item_id, status, title, url, address, deposit, rent, manage_cost, 
                service_type, room_type, floor, all_floors, area_m2, lat, lng, geom, 
                geohash, image_thumbnail, first_crawled_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s, %s, %s, %s)
            ON CONFLICT (item_id) DO UPDATE SET
                status = EXCLUDED.status,
                deposit = EXCLUDED.deposit,
                rent = EXCLUDED.rent,
                updated_at = EXCLUDED.updated_at;
            """
            cur.execute(items_sql, (
                item_id, row.get('status', 'ACTIVE'), row.get('title'), row.get('url'), row.get('address'),
                int(row.get('deposit', 0)), int(row.get('rent', 0)), row.get('manage_cost'),
                row.get('service_type'), row.get('room_type'), row.get('floor'), row.get('all_floors'),
                row.get('area_m2'), float(row['lat']), float(row['lng']),
                float(row['lng']), float(row['lat']),
                row.get('geohash'), row.get('image_thumbnail'), 
                row.get('first_crawled_at') or crawled_at, crawled_at
            ))

            features_sql = """
            INSERT INTO item_features (
                item_id, has_parking, parking_count, has_elevator, bathroom_count,
                residence_type, room_direction, movein_date, approve_date,
                has_air_con, has_fridge, has_washer, has_gas_stove, has_induction,
                has_microwave, has_desk, has_bed, has_closet, has_shoe_rack,
                dist_subway, dist_pharmacy, dist_conv, dist_bus, dist_mart, dist_laundry, dist_cafe,
                is_coupang, is_ssg, is_marketkurly, is_baemin, is_yogiyo,
                is_subway_area, is_convenient_area, is_park_area, is_school_area,
                options_raw, amenities_raw
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (item_id) DO UPDATE SET
                movein_date = EXCLUDED.movein_date,
                parking_count = EXCLUDED.parking_count;
            """
            
            has_p = to_bool(row.get('parking_available_text')) or "가능" in str(row.get('parking_available_text', ''))
            p_count = extract_parking_count(row.get('parking_count_text'))
            m_date = parse_movein_date(row.get('movein_date'), crawled_at)
            
            cur.execute(features_sql, (
                item_id, has_p, p_count, to_bool(row.get('elevator')), row.get('bathroom_count'),
                row.get('residence_type'), row.get('room_direction'), m_date, row.get('approve_date'),
                to_bool(row.get('has_air_conditioner')), to_bool(row.get('has_refrigerator')), to_bool(row.get('has_washing_machine')),
                to_bool(row.get('has_gas_stove')), to_bool(row.get('has_induction')), to_bool(row.get('has_microwave')),
                to_bool(row.get('has_desk')), to_bool(row.get('has_bed')), to_bool(row.get('has_closet')), to_bool(row.get('has_shoe_rack')),
                row.get('subway_distance'), row.get('pharmacy_distance'), row.get('convenience_distance'),
                row.get('bus_distance'), row.get('mart_distance'), row.get('laundry_distance'), row.get('cafe_distance'),
                to_bool(row.get('is_coupang')), to_bool(row.get('is_ssg')), to_bool(row.get('is_marketkurly')),
                to_bool(row.get('is_baemin')), to_bool(row.get('is_yogiyo')),
                to_bool(row.get('is_subway_area')), to_bool(row.get('is_convenient_area')), to_bool(row.get('is_park_area')), to_bool(row.get('is_school_area')),
                row.get('options_raw'), row.get('amenities_raw')
            ))

        conn.commit()
        print(f"{len(df)}개의 데이터 업로드 완료!")
    except Exception as e:
        conn.rollback()
        print(f"에러 발생: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    import glob
    # 가장 최신 파일 하나만 딱 골라내기!
    csv_files = glob.glob("data/csv/item/zigbang_items_*.csv")
    
    if csv_files:
        latest_csv = max(csv_files) # 파일 이름이 날짜순이므로 max가 가장 최신!
        print(f"가장 최신 파일을 발견했어: {os.path.basename(latest_csv)}")
        load_csv_to_db(latest_csv)
    else:
        print("업로드할 CSV 파일이 하나도 안 보여! 'data/csv/item/' 폴더 확인해봐!")
