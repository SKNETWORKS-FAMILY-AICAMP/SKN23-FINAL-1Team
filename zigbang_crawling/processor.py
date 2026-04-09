import pandas as pd
import psycopg2
import re
import os
from datetime import datetime
from dotenv import load_dotenv

# .env 파일 로드
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

def parse_generic_date(text):
    if pd.isna(text) or not str(text).strip(): return None
    text_str = str(text).strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}$", text_str): return text_str
    if len(text_str) == 8 and text_str.isdigit():
        y, m, d = text_str[:4], text_str[4:6], text_str[6:]
    else:
        match = re.search(r"(\d{2,4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})", text_str)
        if match: y, m, d = match.groups()
        else: return None
    year = int(y) + 2000 if len(y) == 2 else int(y)
    try:
        valid_date = datetime(year, max(1, int(m)), max(1, int(d))).date()
        return valid_date.isoformat()
    except: return None

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

COLUMN_MAP = {
    '매물번호': 'item_id', '상태': 'status', '매물_URL': 'url', '전체주소': 'address',
    '보증금': 'deposit', '월세': 'rent', '관리비': 'manage_cost', '건물유형': 'service_type',
    '방타입': 'room_type', '층': 'floor', '총층': 'all_floors', '전용면적_m2': 'area_m2',
    '위도': 'lat', '경도': 'lng', '대표이미지': 'image_thumbnail', '최초수집일시': 'first_crawled_at', '수집일시': 'crawled_at'
}

def load_single_csv_to_db(csv_path):
    """매물 정보 CSV 업로드"""
    if not os.path.exists(csv_path): return
    print(f"\n[자동 업로드] {os.path.basename(csv_path)} -> DB (items)")
    try:
        df = pd.read_csv(csv_path, low_memory=False)
        df = df[df.get('status', df.get('상태', '')).astype(str).str.upper() != 'INACTIVE']
        df = df.rename(columns=COLUMN_MAP)
        conn = get_db_connection()
        cur = conn.cursor()
        success = 0
        for _, row in df.iterrows():
            try:
                item_id = to_int(row.get('item_id'), -1)
                if item_id == -1: continue
                crawled_at = row.get('crawled_at') or datetime.now().isoformat()
                
                cur.execute("""
                    INSERT INTO items (item_id, status, title, url, address, deposit, rent, manage_cost, 
                        service_type, room_type, floor, all_floors, area_m2, lat, lng, geom, 
                        geohash, image_thumbnail, first_crawled_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                        ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s, %s, %s, %s)
                    ON CONFLICT (item_id) DO UPDATE SET
                        status = EXCLUDED.status, deposit = EXCLUDED.deposit,
                        rent = EXCLUDED.rent, updated_at = EXCLUDED.updated_at;
                """, (item_id, str(row.get('status', 'ACTIVE')), str(row.get('title', '제목 없음')), 
                    str(row.get('url', '')), str(row.get('address', '')),
                    to_int(row.get('deposit')), to_int(row.get('rent')), to_int(row.get('manage_cost')),
                    str(row.get('service_type', '')), str(row.get('room_type', '')), 
                    str(row.get('floor', '')), str(row.get('all_floors', '')),
                    to_float(row.get('area_m2')), to_float(row.get('lat')), to_float(row.get('lng')), 
                    to_float(row.get('lng')), to_float(row.get('lat')),
                    str(row.get('geohash', '')), str(row.get('image_thumbnail', '')), 
                    parse_generic_date(row.get('first_crawled_at')) or crawled_at, crawled_at))

                cur.execute("""
                    INSERT INTO item_features (item_id, has_parking, parking_count, has_elevator, bathroom_count,
                        residence_type, room_direction, movein_date, approve_date,
                        has_air_con, has_fridge, has_washer, has_gas_stove, has_induction,
                        has_microwave, has_desk, has_bed, has_closet, has_shoe_rack,
                        dist_subway, dist_pharmacy, dist_conv, dist_bus, dist_mart, dist_laundry, dist_cafe,
                        is_coupang, is_ssg, is_marketkurly, is_baemin, is_yogiyo,
                        is_subway_area, is_convenient_area, is_park_area, is_school_area,
                        options_raw, amenities_raw
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (item_id) DO UPDATE SET movein_date = EXCLUDED.movein_date, parking_count = EXCLUDED.parking_count;
                """, (item_id, to_bool(row.get('parking_available_text')), to_float(row.get('parking_count_text')), 
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
                    str(row.get('options_raw', '')), str(row.get('amenities_raw', ''))))
                conn.commit()
                success += 1
            except Exception: conn.rollback()
        print(f"   ㄴ 완료: {success}개")
        cur.close(); conn.close()
    except Exception as e: print(f"에러: {e}")

def load_images_to_db(csv_path):
    """이미지 정보 CSV 업로드 (S3 경로 규칙 적용)"""
    if not os.path.exists(csv_path): return
    print(f"\n[자동 업로드] {os.path.basename(csv_path)} -> DB (item_images)")
    
    # 날짜 추출 로직 (YYYY-MM-DD 또는 YYYYMMDD 지원)
    date_match = re.search(r"(\d{4}-\d{2}-\d{2})", csv_path)
    if date_match:
        date_str = date_match.group(1)
    else:
        date_match = re.search(r"(\d{8})", csv_path)
        if date_match:
            d = date_match.group(1)
            date_str = f"{d[:4]}-{d[4:6]}-{d[6:]}"
        else:
            date_str = datetime.now().strftime("%Y-%m-%d")
    
    bucket_name = os.getenv("S3_BUCKET")
    if not bucket_name:
        print("에러: .env 파일에 S3_BUCKET 설정이 없습니다.")
        return
    
    try:
        df = pd.read_csv(csv_path)
        conn = get_db_connection()
        cur = conn.cursor()
        success, skipped = 0, 0
        
        # item_id별 이미지 순번 관리를 위한 딕셔너리
        item_image_counts = {}

        for _, row in df.iterrows():
            try:
                item_id = to_int(row.get('item_id'))
                if item_id <= 0: continue

                # 이미지 순번 증가
                item_image_counts[item_id] = item_image_counts.get(item_id, 0) + 1
                img_idx = item_image_counts[item_id]
                
                # S3 URI 형식으로 저장 (s3://버킷명/경로)
                s3_url = f"s3://{bucket_name}/zigbang_data/images/seoul/{date_str}/{item_id}/{item_id}_{img_idx}.jpg"
                
                # 첫 번째 이미지만 대표 이미지(is_main)로 설정
                is_main = (img_idx == 1)

                # items 테이블에 존재할 때만 INSERT (s3_url 중복 체크 포함)
                cur.execute("""
                    INSERT INTO item_images (item_id, s3_url, is_main)
                    SELECT %s, %s, %s
                    WHERE EXISTS (SELECT 1 FROM items WHERE item_id = %s)
                      AND NOT EXISTS (SELECT 1 FROM item_images WHERE s3_url = %s)
                """, (item_id, s3_url, is_main, item_id, s3_url))
                
                if cur.rowcount > 0:
                    success += 1
                else:
                    skipped += 1
                
                if (success + skipped) % 100 == 0:
                    conn.commit()
            except Exception as e:
                conn.rollback()
        
        conn.commit()
        print(f"   ㄴ 완료: {success}개 업로드 ({skipped}개 스킵)")
        cur.close(); conn.close()
    except Exception as e: print(f"이미지 업로드 에러: {e}")

def fix_existing_images_to_s3(csv_path):
    """기존 DB에 잘못 들어간 zigbang URL을 S3 경로로 UPDATE"""
    if not os.path.exists(csv_path): return
    print(f"\n[데이터 복구] {os.path.basename(csv_path)} -> DB (s3_url 업데이트)")
    
    # 날짜 추출 로직
    date_match = re.search(r"(\d{4}-\d{2}-\d{2})", csv_path)
    if date_match:
        date_str = date_match.group(1)
    else:
        date_match = re.search(r"(\d{8})", csv_path)
        if date_match:
            d = date_match.group(1)
            date_str = f"{d[:4]}-{d[4:6]}-{d[6:]}"
        else:
            date_str = datetime.now().strftime("%Y-%m-%d")
            
    bucket_name = os.getenv("S3_BUCKET")
    if not bucket_name:
        print("에러: .env 파일에 S3_BUCKET 설정이 없습니다.")
        return
    
    try:
        df = pd.read_csv(csv_path)
        conn = get_db_connection()
        cur = conn.cursor()
        success = 0
        
        item_image_counts = {}

        for _, row in df.iterrows():
            try:
                item_id = to_int(row.get('item_id'))
                old_url = str(row.get('s3_url') or row.get('image_url', ''))
                if item_id <= 0 or not old_url: continue

                item_image_counts[item_id] = item_image_counts.get(item_id, 0) + 1
                img_idx = item_image_counts[item_id]
                
                # S3 URI 형식으로 저장 (s3://버킷명/경로)
                new_s3_url = f"s3://{bucket_name}/zigbang_data/images/seoul/{date_str}/{item_id}/{item_id}_{img_idx}.jpg"

                # UPDATE 실행
                cur.execute("""
                    UPDATE item_images 
                    SET s3_url = %s 
                    WHERE item_id = %s AND s3_url = %s
                """, (new_s3_url, item_id, old_url))
                
                if cur.rowcount > 0:
                    success += 1
                
                if success % 100 == 0:
                    conn.commit()
            except Exception:
                conn.rollback()
        
        conn.commit()
        print(f"   ㄴ 복구 완료: {success}개 업데이트")
        cur.close(); conn.close()
    except Exception as e: print(f"복구 에러: {e}")
