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
# 2. 전처리 유틸리티 함수 (NaN 방어 로직 강화)
# ======================================================

def extract_parking_count(text):
    """주차 대수 텍스트에서 숫자만 추출 (NaN 방어)"""
    if pd.isna(text) or not str(text).strip():
        return 0.0
    text_str = str(text)
    if "불가능" in text_str:
        return 0.0
    match = re.search(r"(\d+(\.\d+)?)", text_str)
    return float(match.group(1)) if match else 0.0

def parse_movein_date(text, crawled_at_str):
    """입주 가능일 텍스트를 DATE 타입으로 변환 (NaN 방어)"""
    if pd.isna(text) or not str(text).strip():
        return None
    text_str = str(text)
    if "즉시" in text_str:
        try:
            return datetime.fromisoformat(crawled_at_str).date()
        except:
            return datetime.now().date()
    match = re.search(r"(\d{2,4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})", text_str)
    if match:
        y, m, d = match.groups()
        year = int(y) + 2000 if len(y) == 2 else int(y)
        try:
            return datetime(year, int(m), int(d)).date()
        except:
            return None
    return None

def to_bool(val):
    """Boolean 변환 (NaN 방어)"""
    if pd.isna(val): return False
    if isinstance(val, bool): return val
    val_str = str(val).lower().strip()
    if val_str in ('true', '1', 't', 'y', 'yes', '가능'): return True
    return False

def to_int(val, default=0):
    """NaN 방어형 정수 변환"""
    try:
        if pd.isna(val): return default
        return int(float(val))
    except:
        return default

# ======================================================
# 3. 컬럼 맵핑 (한글 -> 영어)
# ======================================================
COLUMN_MAP = {
    '매물번호': 'item_id',
    '상태': 'status',
    '매물_URL': 'url',
    '전체주소': 'address',
    '보증금': 'deposit',
    '월세': 'rent',
    '관리비': 'manage_cost',
    '건물유형': 'service_type',
    '방타입': 'room_type',
    '층': 'floor',
    '총층': 'all_floors',
    '전용면적_m2': 'area_m2',
    '위도': 'lat',
    '경도': 'lng',
    '대표이미지': 'image_thumbnail',
    '최초수집일시': 'first_crawled_at',
    '수집일시': 'crawled_at'
}

# ======================================================
# 4. 메인 로더 함수 (CSV -> DB)
# ======================================================

def load_csv_to_db(csv_path):
    print(f"\n{os.path.basename(csv_path)} 데이터를 DB로 쏘아 올리는 중...")
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        print(f"CSV 로드 실패: {e}")
        return

    # 한글 컬럼명이 있으면 영어로 변경
    df = df.rename(columns=COLUMN_MAP)
    
    # 필수 컬럼(item_id) 체크
    if 'item_id' not in df.columns:
        print(f"에러: 'item_id' 컬럼을 찾을 수 없습니다. (현재 컬럼: {df.columns.tolist()})")
        return

    conn = get_db_connection()
    cur = conn.cursor()
    
    success_count = 0
    fail_count = 0
    first_error_logged = False
    
    try:
        for index, row in df.iterrows():
            try:
                # item_id가 NaN이면 스킵
                if pd.isna(row.get('item_id')):
                    fail_count += 1
                    continue
                
                item_id = int(float(row['item_id']))
                crawled_at = row.get('crawled_at')
                if pd.isna(crawled_at):
                    crawled_at = datetime.now().isoformat()
                
                # DB 작업 시작 (각 행을 독립적인 단위로 처리)
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
                
                lat = float(row.get('lat', 0)) if not pd.isna(row.get('lat')) else 0.0
                lng = float(row.get('lng', 0)) if not pd.isna(row.get('lng')) else 0.0
                
                cur.execute(items_sql, (
                    item_id, row.get('status', 'ACTIVE'), row.get('title', '제목 없음'), row.get('url', ''), row.get('address', ''),
                    to_int(row.get('deposit')), to_int(row.get('rent')), row.get('manage_cost'),
                    row.get('service_type'), row.get('room_type'), row.get('floor'), row.get('all_floors'),
                    row.get('area_m2'), lat, lng,
                    lng, lat,
                    row.get('geohash', ''), row.get('image_thumbnail', ''), 
                    row.get('first_crawled_at') if not pd.isna(row.get('first_crawled_at')) else crawled_at, 
                    crawled_at
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
                
                park_text = str(row.get('parking_available_text', ''))
                has_p = to_bool(row.get('parking_available_text')) or "가능" in park_text
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
                
                conn.commit() # 성공하면 즉시 저장 및 트랜잭션 종료
                success_count += 1
                
            except Exception as row_e:
                conn.rollback() # 실패하면 즉시 롤백해서 트랜잭션 오염 제거
                if not first_error_logged:
                    print(f"!!! 첫 번째 에러 발생 (Index: {index}): {row_e}")
                    first_error_logged = True
                fail_count += 1
                continue

        print(f"완료: 성공 {success_count}개, 실패 {fail_count}개")
    except Exception as e:
        conn.rollback()
        print(f"치명적 에러 발생: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    import glob
    # 프로젝트 구조에 따라 경로 유연하게 설정
    csv_files = sorted(glob.glob(os.path.join(BASE_DIR, "data/csv/item/zigbang_items_*.csv")))
    
    if csv_files:
        print(f"총 {len(csv_files)}개의 히스토리 파일을 발견했어.")
        for csv_file in csv_files:
            load_csv_to_db(csv_file)
        print("\n모든 작업이 마무리됐어!")
    else:
        print("CSV 파일이 안 보여! 'data/csv/item/' 폴더 다시 확인해봐!")
