import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import re
import os
from datetime import datetime
from dotenv import load_dotenv
import numpy as np

# ======================================================
# 1. 환경 설정 및 DB 연결
# ======================================================
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

def parse_generic_date(text):
    if pd.isna(text) or not str(text).strip(): return None
    text_str = str(text).strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}$", text_str): return text_str
    match = re.search(r"(\d{2,4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})", text_str)
    if match:
        y, m, d = match.groups()
        year = int(y) + 2000 if len(y) == 2 else int(y)
        try: return f"{year:04d}-{int(m):02d}-{int(d):02d}"
        except: return None
    return None

def to_int(val, default=0):
    try:
        if pd.isna(val) or str(val).strip() == "": return default
        return int(float(val))
    except: return default

def to_float(val, default=0.0):
    try:
        if pd.isna(val) or str(val).strip() == "": return default
        return float(val)
    except: return default

def to_bool(val):
    if pd.isna(val): return False
    if isinstance(val, bool): return val
    val_str = str(val).lower().strip()
    return val_str in ('true', '1', 't', 'y', 'yes', '가능')

# ======================================================
# 3. 메인 로더 함수 (CSV -> DB)
# ======================================================

COLUMN_MAP = {
    '매물번호': 'item_id', '상태': 'status', '매물_URL': 'url', '전체주소': 'address',
    '보증금': 'deposit', '월세': 'rent', '관리비': 'manage_cost', '건물유형': 'service_type',
    '방타입': 'room_type', '층': 'floor', '총층': 'all_floors', '전용면적_m2': 'area_m2',
    '위도': 'lat', '경도': 'lng', '대표이미지': 'image_thumbnail', '최초수집일시': 'first_crawled_at', '수집일시': 'crawled_at'
}

def load_csv_to_db(csv_path):
    print(f"\n{os.path.basename(csv_path)} 데이터를 DB로 쏘아 올리는 중...")
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        print(f"CSV 로드 실패: {e}"); return

    df = df.rename(columns=COLUMN_MAP)
    conn = get_db_connection()
    cur = conn.cursor()
    success_count, fail_count = 0, 0
    first_error_logged = False
    
    for index, row in df.iterrows():
        try:
            item_id = to_int(row.get('item_id'), -1)
            if item_id == -1: fail_count += 1; continue
            
            crawled_at = row.get('crawled_at')
            if pd.isna(crawled_at): crawled_at = datetime.now().isoformat()
            
            # 1. items 테이블 (INSERT ON CONFLICT)
            items_sql = """
            INSERT INTO items (
                item_id, status, title, url, address, deposit, rent, manage_cost, 
                service_type, room_type, floor, all_floors, area_m2, lat, lng, geom, 
                geohash, image_thumbnail, first_crawled_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s, %s, %s, %s)
            ON CONFLICT (item_id) DO UPDATE SET
                status = EXCLUDED.status, deposit = EXCLUDED.deposit,
                rent = EXCLUDED.rent, updated_at = EXCLUDED.updated_at;
            """
            lat, lng = to_float(row.get('lat')), to_float(row.get('lng'))
            
            cur.execute(items_sql, (
                item_id, str(row.get('status', 'ACTIVE')), str(row.get('title', '제목 없음')), 
                str(row.get('url', '')), str(row.get('address', '')),
                to_int(row.get('deposit')), to_int(row.get('rent')), to_int(row.get('manage_cost')),
                str(row.get('service_type', '')), str(row.get('room_type', '')), 
                str(row.get('floor', '')), str(row.get('all_floors', '')),
                to_float(row.get('area_m2')), lat, lng, lng, lat,
                str(row.get('geohash', '')), str(row.get('image_thumbnail', '')), 
                parse_generic_date(row.get('first_crawled_at')) or crawled_at, crawled_at
            ))

            # 2. item_features 테이블 (INSERT ON CONFLICT)
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
            cur.execute(features_sql, (
                item_id, to_bool(row.get('parking_available_text')), to_float(row.get('parking_count_text')), 
                to_bool(row.get('elevator')), to_int(row.get('bathroom_count')),
                str(row.get('residence_type', '')), str(row.get('room_direction', '')), 
                parse_generic_date(row.get('movein_date')), parse_generic_date(row.get('approve_date')),
                to_bool(row.get('has_air_conditioner')), to_bool(row.get('has_refrigerator')), to_bool(row.get('has_washing_machine')),
                to_bool(row.get('has_gas_stove')), to_bool(row.get('has_induction')), to_bool(row.get('has_microwave')),
                to_bool(row.get('has_desk')), to_bool(row.get('has_bed')), to_bool(row.get('has_closet')), to_bool(row.get('has_shoe_rack')),
                to_int(row.get('subway_distance')), to_int(row.get('pharmacy_distance')), to_int(row.get('convenience_distance')),
                to_int(row.get('bus_distance')), to_int(row.get('mart_distance')), to_int(row.get('laundry_distance')), to_int(row.get('cafe_distance')),
                to_bool(row.get('is_coupang')), to_bool(row.get('is_ssg')), to_bool(row.get('is_marketkurly')),
                to_bool(row.get('is_baemin')), to_bool(row.get('is_yogiyo')),
                to_bool(row.get('is_subway_area')), to_bool(row.get('is_convenient_area')), to_bool(row.get('is_park_area')), to_bool(row.get('is_school_area')),
                str(row.get('options_raw', '')), str(row.get('amenities_raw', ''))
            ))
            conn.commit()
            success_count += 1
        except Exception as row_e:
            conn.rollback()
            if not first_error_logged:
                print(f"!!! 첫 번째 에러 (Index: {index}): {row_e}")
                first_error_logged = True
            fail_count += 1

    print(f"완료: 성공 {success_count}개, 실패 {fail_count}개")
    cur.close(); conn.close()

if __name__ == "__main__":
    import glob
    # zigbang_crawling 폴더 내 data/csv/item/ 경로
    csv_files = sorted(glob.glob(os.path.join(BASE_DIR, "data/csv/item/zigbang_items_*.csv")))
    if csv_files:
        for csv_file in csv_files: load_csv_to_db(csv_file)
    else: print("CSV 파일을 찾을 수 없어! 경로 확인해봐.")
