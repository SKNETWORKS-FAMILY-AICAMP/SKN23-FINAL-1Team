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
    if pd.isna(text) or not str(text).strip() or str(text).strip().lower() in ('false', 'none', 'nan'): 
        return None
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
        if pd.isna(val) or str(val).strip() == "" or str(val).strip().lower() in ('false', 'none', 'nan'): 
            return default
        return int(float(val))
    except: return default

def to_float(val, default=0.0):
    try:
        if pd.isna(val) or str(val).strip() == "" or str(val).strip().lower() in ('false', 'none', 'nan'): 
            return default
        return float(val)
    except: return default

def to_bool(val):
    if pd.isna(val): return False
    if isinstance(val, bool): return val
    val_str = str(val).lower().strip()
    return val_str in ('true', '1', 't', 'y', 'yes', '가능', "주차 가능")

COLUMN_MAP = {
    '매물번호': 'item_id', '상태': 'status', '매물_URL': 'url', '전체주소': 'address',
    '보증금': 'deposit', '월세': 'rent', '관리비': 'manage_cost', '건물유형': 'service_type',
    '방타입': 'room_type', '층': 'floor', '총층': 'all_floors', '전용면적_m2': 'area_m2',
    '위도': 'lat', '경도': 'lng', '대표이미지': 'image_thumbnail', '최초수집일시': 'first_crawled_at', '수집일시': 'crawled_at'
}

def repair_image_urls_in_db():
    """DB에 잘못 저장된 (http 시작) 이미지 URL들을 S3 형식으로 일괄 변환"""
    print("\n[데이터 복구] item_images 테이블의 URL 정제 시작...")
    
    s3_bucket = os.getenv("S3_BUCKET", "skn23-final-1team-355904321127-ap-northeast-2-an")
    s3_prefix = os.getenv("S3_PREFIX", "zigbang_data")

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # 1. 변환 대상 조회 (items 테이블과 조인해서 날짜 정보 가져옴)
        # 같은 item_id 내에서 기존 URL 순서대로 idx 부여
        cur.execute(f"""
            WITH target_images AS (
                SELECT 
                    img.item_id, 
                    img.s3_url as old_url,
                    COALESCE(i.updated_at, i.first_crawled_at, NOW())::date as crawl_date,
                    ROW_NUMBER() OVER(PARTITION BY img.item_id ORDER BY img.s3_url) as idx
                FROM item_images img
                JOIN items i ON img.item_id = i.item_id
                WHERE img.s3_url LIKE 'http%'
            )
            SELECT item_id, old_url, crawl_date, idx FROM target_images;
        """)
        
        targets = cur.fetchall()
        if not targets:
            print("   ㄴ 복구할 대상이 없습니다. (이미 깨끗함!)")
            return

        print(f"   ㄴ 총 {len(targets)}개의 잘못된 URL 발견. 변환 중...")

        count = 0
        for item_id, old_url, crawl_date, idx in targets:
            new_s3_url = f"s3://{s3_bucket}/{s3_prefix}/images/seoul/{crawl_date}/{item_id}/{item_id}_{idx}.jpg"
            
            cur.execute("""
                UPDATE item_images 
                SET s3_url = %s 
                WHERE item_id = %s AND s3_url = %s
            """, (new_s3_url, item_id, old_url))
            
            count += 1
            if count % 500 == 0:
                conn.commit()
                print(f"      - {count}개 완료...")

        conn.commit()
        print(f"   ㄴ 완료! 총 {count}개의 이미지 주소를 S3 형식으로 갱신했습니다.")
        cur.close(); conn.close()
    except Exception as e:
        print(f"복구 에러: {e}")

def load_single_csv_to_db(csv_path):
    """매물 정보 CSV 업로드"""
    if not os.path.exists(csv_path): return
    print(f"\n[자동 업로드] {os.path.basename(csv_path)} -> DB (items)")
    try:
        df = pd.read_csv(csv_path, low_memory=False)
        df = df.rename(columns=COLUMN_MAP)
        conn = get_db_connection()
        cur = conn.cursor()
        success = 0
        for _, row in df.iterrows():
            try:
                item_id = to_int(row.get('item_id'), -1)
                if item_id == -1: continue
                
                status = str(row.get('status', 'ACTIVE')).upper()
                raw_crawled_at = row.get('crawled_at')
                if not raw_crawled_at or str(raw_crawled_at).strip().lower() in ('false', 'none', 'nan'):
                    crawled_at = datetime.now().isoformat()
                else:
                    crawled_at = str(raw_crawled_at)
                
                cur.execute("""
                    INSERT INTO items (item_id, status, title, url, address, deposit, rent, manage_cost, 
                        service_type, room_type, floor, all_floors, area_m2, lat, lng, geom, 
                        geohash, image_thumbnail, first_crawled_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                        ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s, %s, %s, %s)
                    ON CONFLICT (item_id) DO UPDATE SET
                        status = EXCLUDED.status,
                        updated_at = EXCLUDED.updated_at,
                        -- ACTIVE일 때만 업데이트하고, INACTIVE일 때는 기존 값 유지
                        title = CASE WHEN EXCLUDED.status = 'ACTIVE' THEN EXCLUDED.title ELSE items.title END,
                        address = CASE WHEN EXCLUDED.status = 'ACTIVE' THEN EXCLUDED.address ELSE items.address END,
                        deposit = CASE WHEN EXCLUDED.status = 'ACTIVE' THEN EXCLUDED.deposit ELSE items.deposit END,
                        rent = CASE WHEN EXCLUDED.status = 'ACTIVE' THEN EXCLUDED.rent ELSE items.rent END,
                        manage_cost = CASE WHEN EXCLUDED.status = 'ACTIVE' THEN EXCLUDED.manage_cost ELSE items.manage_cost END,
                        floor = CASE WHEN EXCLUDED.status = 'ACTIVE' THEN EXCLUDED.floor ELSE items.floor END,
                        all_floors = CASE WHEN EXCLUDED.status = 'ACTIVE' THEN EXCLUDED.all_floors ELSE items.all_floors END,
                        area_m2 = CASE WHEN EXCLUDED.status = 'ACTIVE' THEN EXCLUDED.area_m2 ELSE items.area_m2 END,
                        image_thumbnail = CASE WHEN EXCLUDED.status = 'ACTIVE' THEN EXCLUDED.image_thumbnail ELSE items.image_thumbnail END;
                """, (item_id, status, str(row.get('title', '제목 없음')), 
                    str(row.get('url', '')), str(row.get('address', '')),
                    to_int(row.get('deposit')), to_int(row.get('rent')), to_int(row.get('manage_cost')),
                    str(row.get('service_type', '')), str(row.get('room_type', '')), 
                    str(row.get('floor', '')), str(row.get('all_floors', '')),
                    to_float(row.get('area_m2')), to_float(row.get('lat')), to_float(row.get('lng')), 
                    to_float(row.get('lng')), to_float(row.get('lat')),
                    str(row.get('geohash', '')), str(row.get('image_thumbnail', '')), 
                    parse_generic_date(row.get('first_crawled_at')) or crawled_at, crawled_at))

                if status == 'ACTIVE':
                    cur.execute("""
                        INSERT INTO item_features (
                            item_id, has_parking, parking_count, has_elevator, bathroom_count,
                            residence_type, room_direction, movein_date, approve_date,
                            has_air_con, has_fridge, has_washer, has_gas_stove, has_induction,
                            has_microwave, has_desk, has_bed, has_closet, has_shoe_rack,
                            dist_subway, dist_pharmacy, dist_conv, dist_bus, dist_mart, dist_laundry, dist_cafe,
                            is_coupang, is_ssg, is_marketkurly, is_baemin, is_yogiyo,
                            is_subway_area, is_convenient_area, is_park_area, is_school_area,
                            options_raw, amenities_raw, has_bookcase, has_sink
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (item_id) DO UPDATE SET 
                            has_parking = EXCLUDED.has_parking, parking_count = EXCLUDED.parking_count, has_elevator = EXCLUDED.has_elevator,
                            bathroom_count = EXCLUDED.bathroom_count, residence_type = EXCLUDED.residence_type, room_direction = EXCLUDED.room_direction,
                            movein_date = EXCLUDED.movein_date, approve_date = EXCLUDED.approve_date, has_air_con = EXCLUDED.has_air_con,
                            has_fridge = EXCLUDED.has_fridge, has_washer = EXCLUDED.has_washer, has_gas_stove = EXCLUDED.has_gas_stove,
                            has_induction = EXCLUDED.has_induction, has_microwave = EXCLUDED.has_microwave, has_desk = EXCLUDED.has_desk,
                            has_bed = EXCLUDED.has_bed, has_closet = EXCLUDED.has_closet, has_shoe_rack = EXCLUDED.has_shoe_rack,
                            dist_subway = EXCLUDED.dist_subway, dist_pharmacy = EXCLUDED.dist_pharmacy, dist_conv = EXCLUDED.dist_conv,
                            dist_bus = EXCLUDED.dist_bus, dist_mart = EXCLUDED.dist_mart, dist_laundry = EXCLUDED.dist_laundry,
                            dist_cafe = EXCLUDED.dist_cafe, is_coupang = EXCLUDED.is_coupang, is_ssg = EXCLUDED.is_ssg,
                            is_marketkurly = EXCLUDED.is_marketkurly, is_baemin = EXCLUDED.is_baemin, is_yogiyo = EXCLUDED.is_yogiyo,
                            is_subway_area = EXCLUDED.is_subway_area, is_convenient_area = EXCLUDED.is_convenient_area,
                            is_park_area = EXCLUDED.is_park_area, is_school_area = EXCLUDED.is_school_area,
                            options_raw = EXCLUDED.options_raw, amenities_raw = EXCLUDED.amenities_raw,
                            has_bookcase = EXCLUDED.has_bookcase, has_sink = EXCLUDED.has_sink;
                    """, (
                        item_id, to_bool(row.get('parking_available_text')), to_float(row.get('parking_count_text')), to_bool(row.get('elevator')), to_int(row.get('bathroom_count')),
                        str(row.get('residence_type', '')), str(row.get('room_direction', '')), parse_generic_date(row.get('movein_date')), parse_generic_date(row.get('approve_date')),
                        to_bool(row.get('has_air_conditioner')), to_bool(row.get('has_refrigerator')), to_bool(row.get('has_washing_machine')), to_bool(row.get('has_gas_stove')), to_bool(row.get('has_induction')),
                        to_bool(row.get('has_microwave')), to_bool(row.get('has_desk')), to_bool(row.get('has_bed')), to_bool(row.get('has_closet')), to_bool(row.get('has_shoe_rack')),
                        to_int(row.get('subway_distance')), to_int(row.get('pharmacy_distance')), to_int(row.get('convenience_distance')), to_int(row.get('bus_distance')), to_int(row.get('mart_distance')), to_int(row.get('laundry_distance')), to_int(row.get('cafe_distance')),
                        to_bool(row.get('is_coupang')), to_bool(row.get('is_ssg')), to_bool(row.get('is_marketkurly')), to_bool(row.get('is_baemin')), to_bool(row.get('is_yogiyo')),
                        to_bool(row.get('is_subway_area')), to_bool(row.get('is_convenient_area')), to_bool(row.get('is_park_area')), to_bool(row.get('is_school_area')),
                        str(row.get('options_raw', '')), str(row.get('amenities_raw', '')), 
                        to_bool(row.get('has_bookcase')), to_bool(row.get('has_sink'))
                    ))
                else:
                    cur.execute("""
                        INSERT INTO item_features (item_id, has_parking, parking_count, has_elevator, bathroom_count,
                            residence_type, room_direction, movein_date, approve_date,
                            has_air_con, has_fridge, has_washer, has_gas_stove, has_induction,
                            has_microwave, has_desk, has_bed, has_closet, has_shoe_rack,
                            dist_subway, dist_pharmacy, dist_conv, dist_bus, dist_mart, dist_laundry, dist_cafe,
                            is_coupang, is_ssg, is_marketkurly, is_baemin, is_yogiyo,
                            is_subway_area, is_convenient_area, is_park_area, is_school_area,
                            options_raw, amenities_raw, has_bookcase, has_sink
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (item_id) DO NOTHING;
                    """, (item_id, to_bool(row.get('parking_available_text')), to_float(row.get('parking_count_text')), to_bool(row.get('elevator')), to_int(row.get('bathroom_count')),
                        str(row.get('residence_type', '')), str(row.get('room_direction', '')), parse_generic_date(row.get('movein_date')), parse_generic_date(row.get('approve_date')),
                        to_bool(row.get('has_air_conditioner')), to_bool(row.get('has_refrigerator')), to_bool(row.get('has_washing_machine')), to_bool(row.get('has_gas_stove')), to_bool(row.get('has_induction')),
                        to_bool(row.get('has_microwave')), to_bool(row.get('has_desk')), to_bool(row.get('has_bed')), to_bool(row.get('has_closet')), to_bool(row.get('has_shoe_rack')),
                        to_int(row.get('subway_distance')), to_int(row.get('pharmacy_distance')), to_int(row.get('convenience_distance')), to_int(row.get('bus_distance')), to_int(row.get('mart_distance')), to_int(row.get('laundry_distance')), to_int(row.get('cafe_distance')),
                        to_bool(row.get('is_coupang')), to_bool(row.get('is_ssg')), to_bool(row.get('is_marketkurly')), to_bool(row.get('is_baemin')), to_bool(row.get('is_yogiyo')),
                        to_bool(row.get('is_subway_area')), to_bool(row.get('is_convenient_area')), to_bool(row.get('is_park_area')), to_bool(row.get('is_school_area')),
                        str(row.get('options_raw', '')), str(row.get('amenities_raw', '')), 
                        to_bool(row.get('has_bookcase')), to_bool(row.get('has_sink'))))
                
                conn.commit()
                success += 1
            except Exception as e: 
                print(f"   ㄴ [행 에러] ID {item_id}: {e}")
                conn.rollback()
        print(f"   ㄴ 완료: {success}개")
        cur.close(); conn.close()
    except Exception as e: print(f"에러: {e}")

def load_images_to_db(csv_path):
    """이미지 정보 CSV 업로드 (S3 URL 자동 생성 로직 포함)"""
    if not os.path.exists(csv_path): return
    print(f"\n[자동 업로드] {os.path.basename(csv_path)} -> DB (item_images)")
    
    # 파일명에서 날짜 추출 (예: zigbang_images_20260409_1620.csv -> 2026-04-09)
    date_match = re.search(r"(\d{4})(\d{2})(\d{2})", os.path.basename(csv_path))
    crawl_date = f"{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}" if date_match else datetime.now().strftime("%Y-%m-%d")
    
    s3_bucket = os.getenv("S3_BUCKET", "skn23-final-1team-355904321127-ap-northeast-2-an")
    s3_prefix = os.getenv("S3_PREFIX", "zigbang_data")

    try:
        df = pd.read_csv(csv_path)
        conn = get_db_connection()
        cur = conn.cursor()
        success, skipped = 0, 0
        item_img_counter = {} # 각 item_id별 이미지 순번 트래킹

        for _, row in df.iterrows():
            try:
                item_id = to_int(row.get('item_id'))
                if item_id == 0: continue

                # 순번 계산 (1, 2, 3...)
                item_img_counter[item_id] = item_img_counter.get(item_id, 0) + 1
                idx = item_img_counter[item_id]

                # S3 URL 결정
                s3_url = row.get('s3_url')
                # CSV에 s3_url이 없거나, http로 시작하는 원본 주소면 S3 형식으로 변환
                if not s3_url or str(s3_url).startswith('http'):
                    s3_url = f"s3://{s3_bucket}/{s3_prefix}/images/seoul/{crawl_date}/{item_id}/{item_id}_{idx}.jpg"

                # 첫 번째 이미지만 is_main=True
                is_main = (idx == 1)

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
