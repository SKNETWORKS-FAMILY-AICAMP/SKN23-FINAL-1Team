import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import csv
import os
import time
import glob
import json
import random
import boto3
import threading
import pygeohash as pgh
from botocore.exceptions import ClientError
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import List, Dict, Any, Optional, Tuple, Set
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed

# ======================================================
# 환경 변수 및 설정
# ======================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(ROOT_DIR, ".env"))

KST = ZoneInfo("Asia/Seoul")

session = requests.Session()
retry = Retry(total=5, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
adapter = HTTPAdapter(max_retries=retry)
session.mount("http://", adapter)
session.mount("https://", adapter)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
]

S3_BUCKET = os.getenv("S3_BUCKET")
S3_PREFIX = os.getenv("S3_PREFIX", "zigbang_data") 
s3_client = boto3.client("s3")

DATA_DIR   = os.path.join(BASE_DIR, "data")
ITEM_DIR   = os.path.join(DATA_DIR, "csv", "item")
IMAGE_DIR  = os.path.join(DATA_DIR, "csv", "image")
CACHE_DIR  = os.path.join(DATA_DIR, "cache")
GH_CACHE   = os.path.join(CACHE_DIR, "geohash_list_seoul_v2.json")

ITEM_FILE  = ""
IMAGE_FILE = ""

MAX_WORKERS   = 15 
ID_WORKERS    = 15 
SAVE_INTERVAL = 50

ZIGBANG_API = {
    "geohash":     "https://apis.zigbang.com/v2/items/oneroom",
    "item_detail": "https://apis.zigbang.com/v3/items/{item_id}",
}

lock = threading.Lock()

REGION_BOUNDS = {
    "서울": {"lat_min": 37.413, "lat_max": 37.715, "lng_min": 126.734, "lng_max": 127.269, "step_lat": 0.04, "step_lng": 0.04},
}

# ======================================================
# 컬럼 정의 (데이터 일관성 유지)
# ======================================================
ITEM_COLUMNS = [
    "item_id", "status", "url", "address", "address_jibun", "deposit", "rent", "manage_cost", 
    "service_type", "room_type", "area_m2", "floor", "all_floors", "lat", "lng", 
    "title", "image_thumbnail", "first_crawled_at", "crawled_at", "is_premium", 
    "parking_available_text", "parking_count_text", "api_updated_at", "approve_date",
    "bathroom_count", "residence_type", "elevator", "room_direction", "direction_criterion", "movein_date",
    "subway_exists", "subway_distance", "pharmacy_exists", "pharmacy_distance", 
    "convenience_exists", "convenience_distance", "bus_exists", "bus_distance", "mart_exists", "mart_distance",
    "laundry_exists", "laundry_distance", "cafe_exists", "cafe_distance",
    "is_coupang", "is_ssg", "is_marketkurly", "is_baemin", "is_yogiyo",
    "is_subway_area", "is_convenient_area", "is_park_area", "is_school_area",
    "has_air_conditioner", "has_refrigerator", "has_washing_machine", "has_gas_stove", "has_induction",
    "has_microwave", "has_desk", "has_bed", "has_closet", "has_shoe_rack",
    "amenities_raw", "distributions_raw", "options_raw", "has_bookcase", "has_sink"
]

# ======================================================
# 유틸리티 함수
# ======================================================

def upload_to_s3(local_file: str, s3_path: str):
    full_s3_path = f"{S3_PREFIX}/{s3_path}".replace("//", "/")
    try:
        s3_client.upload_file(local_file, S3_BUCKET, full_s3_path)
        print(f"S3 업로드 성공: {full_s3_path}")
    except Exception as e:
        print(f"S3 업로드 실패 ({os.path.basename(local_file)}): {e}")

def get_all_geohashes(precision: int = 5) -> List[str]:
    os.makedirs(CACHE_DIR, exist_ok=True)
    if os.path.exists(GH_CACHE):
        with open(GH_CACHE, "r", encoding="utf-8") as f:
            result = json.load(f)
            print(f"캐시된 서울 지오해시 리스트 로딩 완료! (총 {len(result)} 구역)")
            return result

    print(f"서울 지오해시 리스트 계산 중 (정밀도 {precision})...")
    all_gh = set()
    bounds = REGION_BOUNDS["서울"]
    lat, lng_step, lat_step = bounds["lat_min"], bounds["step_lng"], bounds["step_lat"]
    while lat <= bounds["lat_max"]:
        lng = bounds["lng_min"]
        while lng <= bounds["lng_max"]:
            all_gh.add(pgh.encode(lat, lng, precision=precision))
            lng += lng_step
        lat += lat_step
    result = sorted(list(all_gh))
    with open(GH_CACHE, "w", encoding="utf-8") as f:
        json.dump(result, f)
    print(f"총 {len(result)}개의 서울 광속 지오해시 구역 생성 완료!")
    return result

def setup_files_and_get_states() -> Dict[int, Dict[str, Any]]:
    os.makedirs(ITEM_DIR, exist_ok=True)
    os.makedirs(IMAGE_DIR, exist_ok=True)
    item_history = {}
    date_str = datetime.now(KST).strftime("%Y%m%d")
    pattern = os.path.join(ITEM_DIR, "**", "zigbang_items*.csv")
    prev_files = sorted(glob.glob(pattern, recursive=True))
    
    if prev_files:
        print(f"히스토리 데이터 파일 {len(prev_files)}개 통합 분석 중...")
        for f_path in prev_files:
            try:
                with open(f_path, "r", encoding="utf-8-sig") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        def get_val(eng, kor): return row.get(eng) or row.get(kor)
                        iid_str = get_val("item_id", "매물번호")
                        if not iid_str: continue
                        iid = int(iid_str)
                        if iid not in item_history:
                            item_history[iid] = {
                                "status": get_val("status", "상태") or "ACTIVE",
                                "first_crawled_at": get_val("first_crawled_at", "최초수집일시") or get_val("crawled_at", "수집일시")
                            }
                        else:
                            item_history[iid]["status"] = get_val("status", "상태") or "ACTIVE"
            except Exception as e: print(f"{os.path.basename(f_path)} 분석 실패: {e}")
        print(f"누적 매물: {len(item_history)}개")
    else: print("히스토리 없음. 새로운 데이터베이스를 구축합니다.")
    
    global ITEM_FILE, IMAGE_FILE
    ITEM_FILE = os.path.join(ITEM_DIR, f"zigbang_items_{date_str}.csv")
    IMAGE_FILE = os.path.join(IMAGE_DIR, f"zigbang_images_{datetime.now(KST).strftime('%Y%m%d_%H%M')}.csv")
    
    IMAGE_COLUMNS = ["item_id", "image_url"]
    if not os.path.exists(ITEM_FILE):
        with open(ITEM_FILE, "w", newline="", encoding="utf-8-sig") as f:
            csv.DictWriter(f, fieldnames=ITEM_COLUMNS).writeheader()
    with open(IMAGE_FILE, "w", newline="", encoding="utf-8-sig") as f:
        csv.DictWriter(f, fieldnames=IMAGE_COLUMNS).writeheader()
    return item_history

def append_item(row):
    with lock:
        try:
            with open(ITEM_FILE, "a", newline="", encoding="utf-8-sig") as f:
                writer = csv.DictWriter(f, fieldnames=ITEM_COLUMNS, extrasaction='ignore')
                writer.writerow(row)
                f.flush(); os.fsync(f.fileno())
        except Exception as e: print(f"CSV 쓰기 에러 (ID: {row.get('item_id')}): {e}")

def append_images(rows):
    IMAGE_COLUMNS = ["item_id", "image_url"]
    with lock:
        with open(IMAGE_FILE, "a", newline="", encoding="utf-8-sig") as f:
            csv.DictWriter(f, fieldnames=IMAGE_COLUMNS).writerows(rows)
            f.flush(); os.fsync(f.fileno())

def get_item_ids(geohash: str) -> List[int]:
    time.sleep(random.uniform(0.5, 1.2))
    headers = {"User-Agent": random.choice(USER_AGENTS), "Accept": "application/json", "Referer": "https://www.zigbang.com/"}
    try:
        res = session.get(ZIGBANG_API["geohash"], params={"geohash": geohash}, headers=headers, timeout=10)
        if res.status_code == 200: return [i["itemId"] for i in res.json().get("items", [])]
        elif res.status_code == 403: print(f"IP 차단 감지 (403)! ({geohash})")
    except: pass
    return []

def get_detail(item_id: int) -> Optional[Dict]:
    time.sleep(random.uniform(0.5, 1.0))
    headers = {"User-Agent": random.choice(USER_AGENTS), "Accept": "application/json", "Referer": f"https://www.zigbang.com/home/oneroom/items/{item_id}"}
    urls = [ZIGBANG_API["item_detail"].format(item_id=item_id), f"https://apis.zigbang.com/v2/items/{item_id}", f"https://apis.zigbang.com/v2/items/villa/{item_id}"]
    for url in urls:
        try:
            res = session.get(url, headers=headers, timeout=10)
            if res.status_code == 200:
                data = res.json()
                return data if "item" in data else {"item": data}
            elif res.status_code == 404: return {"status": "DELETED", "itemId": item_id}
        except: pass
    return None

def transform(data: Dict, status: str = "ACTIVE") -> Tuple[Optional[Dict], List[Dict]]:
    item = data.get("item")
    if not item: return None, []
    item_id = item.get("itemId")
    addr_origin = item.get("addressOrigin") or {}
    addr = (item.get("jibunAddress") or addr_origin.get("fullText") or item.get("address") or "")
    raw_imgs = item.get("images", [])
    images = [f"{img.strip()}?w=1200" for img in raw_imgs if img]
    
    neighborhoods = item.get("neighborhoods") or {}
    
    infra_data = {}
    target_pois = {
        "지하철역": "subway", "약국": "pharmacy", "편의점": "convenience", 
        "버스정류장": "bus", "대형마트": "mart", "세탁소": "laundry", "카페": "cafe"
    }
    nearby_pois = neighborhoods.get("nearbyPois", [])
    for prefix in target_pois.values():
        infra_data[f"{prefix}_exists"] = False
        infra_data[f"{prefix}_distance"] = None
    for poi in nearby_pois:
        p_type = poi.get("poiType")
        if p_type in target_pois:
            prefix = target_pois[p_type]
            infra_data[f"{prefix}_exists"] = poi.get("exists", False)
            infra_data[f"{prefix}_distance"] = poi.get("distance")

    dist_data = {"is_coupang": False, "is_ssg": False, "is_marketkurly": False, "is_baemin": False, "is_yogiyo": False}
    distributions = neighborhoods.get("distributions", [])
    dist_map = {"쿠팡": "is_coupang", "SSG": "is_ssg", "마켓컬리": "is_marketkurly", "배달의 민족": "is_baemin", "요기요": "is_yogiyo"}
    dist_titles = []
    for dist in distributions:
        c_name = dist.get("companyName")
        if c_name: dist_titles.append(c_name)
        if c_name in dist_map: dist_data[dist_map[c_name]] = True

    amenity_data = {"is_subway_area": False, "is_convenient_area": False, "is_park_area": False, "is_school_area": False}
    amenities = neighborhoods.get("amenities", [])
    amenity_map = {"역세권": "is_subway_area", "슬세권": "is_convenient_area", "공세권": "is_park_area", "학세권": "is_school_area"}
    amenity_titles = []
    for amen in amenities:
        title = amen.get("title")
        if not title: continue
        if title in amenity_map: amenity_data[amenity_map[title]] = True
        if title.endswith("세권"): amenity_titles.append(title)

    option_data = {
        "has_air_conditioner": False, "has_refrigerator": False, "has_washing_machine": False,
        "has_gas_stove": False, "has_induction": False, "has_microwave": False,
        "has_desk": False, "has_bed": False, "has_closet": False, "has_shoe_rack": False,
        "has_bookcase": False, "has_sink": False
    }
    options = item.get("options", [])
    option_map = {
        "에어컨": "has_air_conditioner", "냉장고": "has_refrigerator", "세탁기": "has_washing_machine",
        "가스레인지": "has_gas_stove", "인덕션": "has_induction", "전자레인지": "has_microwave",
        "책상": "has_desk", "침대": "has_bed", "옷장": "has_closet", "신발장": "has_shoe_rack",
        "책장": "has_bookcase", "싱크대": "has_sink"
    }
    for opt in options:
        if opt in option_map: option_data[option_map[opt]] = True

    try:
        p_info, l_info, f_info, a_info, m_info = item.get("price") or {}, item.get("location") or {}, item.get("floor") or {}, item.get("area") or {}, item.get("manageCost") or {}
        item_row = {
            "item_id": item_id, "status": status, "url": f"https://www.zigbang.com/home/oneroom/items/{item_id}",
            "address": addr, "address_jibun": addr, "deposit": p_info.get("deposit") or p_info.get("price"), "rent": p_info.get("rent", 0),
            "manage_cost": m_info.get("amount") if isinstance(m_info, dict) else None, "service_type": item.get("serviceType"), "room_type": item.get("roomType"),
            "area_m2": a_info.get("전용면적M2") or a_info.get("m2"), "floor": f_info.get("floor"), "all_floors": f_info.get("allFloors"),
            "lat": l_info.get("lat"), "lng": l_info.get("lng"), "title": item.get("title", ""),
            "image_thumbnail": images[0] if images else "", "first_crawled_at": "", "crawled_at": datetime.now(KST).isoformat(),
            "is_premium": item.get("isPremium", False), "parking_available_text": item.get("parkingAvailableText", ""), "parking_count_text": item.get("parkingCountText", ""),
            "api_updated_at": item.get("updatedAt", ""), "approve_date": item.get("approveDate", ""), "bathroom_count": item.get("bathroomCount", ""),
            "residence_type": item.get("residenceType", ""), "elevator": item.get("elevator"), "room_direction": item.get("roomDirection", ""),
            "direction_criterion": item.get("directionCriterion", ""), "movein_date": item.get("moveinDate", ""),
            "amenities_raw": "|".join(amenity_titles), "distributions_raw": "|".join(dist_titles), "options_raw": "|".join(options),
            **infra_data, **dist_data, **amenity_data, **option_data
        }
        return item_row, [{"item_id": item_id, "image_url": img} for img in images]
    except Exception as e:
        print(f"변환 에러 (ID: {item_id}): {e}")
        return None, []

def crawl():
    print("=" * 60)
    print("직방 서울 전용 초고속 크롤링 시스템 (Turbo v3 + S3)")
    print(f"   실행 일시: {datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60 + "\n")
    start_total = time.time()
    item_history = setup_files_and_get_states()
    last_active_ids = {iid for iid, info in item_history.items() if info["status"] == "ACTIVE"}
    geohash_list = get_all_geohashes()
    current_found_ids: Set[int] = set()
    print(f"ID 수집 중... (병렬 {ID_WORKERS}개)")
    with ThreadPoolExecutor(max_workers=ID_WORKERS) as executor:
        future_to_gh = {executor.submit(get_item_ids, gh): gh for gh in geohash_list}
        done_gh = 0
        for future in as_completed(future_to_gh):
            ids = future.result()
            if ids: current_found_ids.update(ids)
            done_gh += 1
            if done_gh % 200 == 0 or done_gh == len(geohash_list): print(f"   - 진행률: [{done_gh}/{len(geohash_list)}] ({done_gh/len(geohash_list)*100:.1f}%)")

    new_ids = current_found_ids - item_history.keys()
    reactivated_ids = (current_found_ids & item_history.keys()) - last_active_ids
    deleted_ids = last_active_ids - current_found_ids

    # 모드 설정 (강제 업데이트: current_found_ids / 일반: new_ids)
    # 현재는 '일반 모드'로 설정함!
    to_fetch_ids = new_ids
    print(f"\n분석 결과: 현재 {len(current_found_ids)}개 (신규 {len(to_fetch_ids)}개 업데이트 모드)")
    
    if deleted_ids:
        to_deactivate = [did for did in deleted_ids if item_history.get(did, {}).get("status") == "ACTIVE"]
        if to_deactivate:
            print(f"{len(to_deactivate)}개의 매물을 INACTIVE 상태로 기록 중...")
            for did in to_deactivate: 
                append_item({"item_id": did, "status": "INACTIVE", "crawled_at": datetime.now(KST).isoformat()})
                with lock: item_history[did] = {"status": "INACTIVE", "first_crawled_at": item_history.get(did, {}).get("first_crawled_at")}
        else: print("새로 삭제된 매물은 없네! (이미 INACTIVE 상태)")

    if to_fetch_ids:
        print(f"상세 정보 수집 중... (대상: {len(to_fetch_ids)}개, 병렬 {MAX_WORKERS}개)")
        start_detail, done, ghost_count = time.time(), 0, 0
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {executor.submit(get_detail, iid): iid for iid in to_fetch_ids}
            for future in as_completed(futures):
                current_iid = futures[future]
                data = future.result(); done += 1
                if data:
                    if data.get("status") == "DELETED":
                        append_item({"item_id": current_iid, "status": "INACTIVE", "first_crawled_at": datetime.now(KST).isoformat(), "crawled_at": datetime.now(KST).isoformat()})
                        with lock: item_history[current_iid] = {"status": "INACTIVE", "first_crawled_at": datetime.now(KST).isoformat()}
                        ghost_count += 1
                        continue
                    item_row, image_rows = transform(data, status="ACTIVE")
                    if item_row: 
                        first_seen = item_history.get(current_iid, {}).get("first_crawled_at") or datetime.now(KST).isoformat()
                        item_row["first_crawled_at"] = first_seen
                        append_item(item_row)
                        with lock: item_history[current_iid] = {"status": "ACTIVE", "first_crawled_at": first_seen}
                        if image_rows: append_images(image_rows)
                if done % SAVE_INTERVAL == 0 or done == len(to_fetch_ids):
                    speed = done / (time.time() - start_detail)
                    print(f"  [{done:5d}/{len(to_fetch_ids)}] 속도: {speed:.1f}/초 (유령 감지: {ghost_count}개)")
        if ghost_count > 0: print(f"\n오늘 총 {ghost_count}개의 유령 매물(404)을 성불시켰습니다.")

    print("\n서울 결과물을 S3로 업로드 중...")
    upload_to_s3(ITEM_FILE, f"csv/seoul/item/{os.path.basename(ITEM_FILE)}")
    upload_to_s3(IMAGE_FILE, f"csv/seoul/image/{os.path.basename(IMAGE_FILE)}")
    print("\n[서울] 이미지 수집 및 S3 업로드 시작...")
    import download_images_seoul
    download_images_seoul.main(IMAGE_FILE)

    # --------------------------------------------------
    # [추가] DB 자동 업로드 실행
    # --------------------------------------------------
    import processor
    
    try:
        processor.load_single_csv_to_db(ITEM_FILE)
        processor.load_images_to_db(IMAGE_FILE)
    except Exception as e:
        print(f"\n[에러] DB 자동 업로드 중 오류 발생: {e}")

    print("\n" + "=" * 60 + f"\n서울 수집 작업 완료! (소요시간: {(time.time()-start_total)/60:.1f}분)\n" + "=" * 60)

if __name__ == "__main__":
    crawl()
