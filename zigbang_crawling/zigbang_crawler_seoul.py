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
from botocore.exceptions import ClientError

# 유저 에이전트 리스트 (사람인 척하기!)
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
]
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import List, Dict, Any, Optional, Tuple, Set
from dotenv import load_dotenv

# ======================================================
# 환경 변수 로드 (프로젝트 루트의 .env 읽기)
# ======================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(ROOT_DIR, ".env"))

# KST 타임존 설정
KST = ZoneInfo("Asia/Seoul")

# 세션 설정 (재시도 로직 포함)
session = requests.Session()
retry = Retry(total=5, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
adapter = HTTPAdapter(max_retries=retry)
session.mount("http://", adapter)
session.mount("https://", adapter)
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import pygeohash as pgh

# ======================================================
# S3 설정 (환경 변수에서 로드)
# ======================================================

S3_BUCKET = os.getenv("S3_BUCKET")
S3_PREFIX = os.getenv("S3_PREFIX", "zigbang_data") 
s3_client = boto3.client("s3")

def upload_to_s3(local_file: str, s3_path: str):
    """로컬 파일을 S3의 부모 폴더 아래에 업로드"""
    full_s3_path = f"{S3_PREFIX}/{s3_path}".replace("//", "/")
    try:
        s3_client.upload_file(local_file, S3_BUCKET, full_s3_path)
        print(f"☁️  S3 업로드 성공: {full_s3_path}")
    except Exception as e:
        print(f"❌ S3 업로드 실패 ({os.path.basename(local_file)}): {e}")

# ======================================================
# 설정 (로컬 경로 및 API - 기존과 동일)
# ======================================================

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
ITEM_DIR   = os.path.join(BASE_DIR, "data", "csv", "item")
IMAGE_DIR  = os.path.join(BASE_DIR, "data", "csv", "image")
CACHE_DIR  = os.path.join(BASE_DIR, "data", "cache")
GH_CACHE   = os.path.join(CACHE_DIR, "geohash_list.json")

ITEM_FILE  = ""
IMAGE_FILE = ""

MAX_WORKERS   = 20 
ID_WORKERS    = 20 
SAVE_INTERVAL = 50

ZIGBANG_API = {
    "geohash":     "https://apis.zigbang.com/v2/items/oneroom",
    "item_detail": "https://apis.zigbang.com/v3/items/{item_id}",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "Accept":     "application/json",
    "Referer":    "https://www.zigbang.com/",
    "Origin":     "https://www.zigbang.com",
}

# 🔒 멀티 스레딩 안전을 위한 자물쇠 생성!
lock = threading.Lock()

# ... (상단 설정 부분)
MAX_WORKERS   = 15 
ID_WORKERS    = 15 # 초정밀 모드이므로 안전하게 10으로 하향 조정!
SAVE_INTERVAL = 50

# ... (중략) ...

def get_all_geohashes(precision: int = 5) -> List[str]:
    # 최적화된 서울 지오해시 캐시 파일명
    SEOUL_GH_CACHE = os.path.join(CACHE_DIR, "geohash_list_seoul_v2.json")
    
    os.makedirs(CACHE_DIR, exist_ok=True)
    if os.path.exists(SEOUL_GH_CACHE):
        with open(SEOUL_GH_CACHE, "r", encoding="utf-8") as f:
            result = json.load(f)
            print(f"💾 캐시된 서울 지오해시 리스트 로딩 완료! (총 {len(result)} 구역)")
            return result

    print(f"🧮 서울 지오해시 리스트 계산 중 (정밀도 {precision}, 광속 간격 적용)...")
    all_gh = set()
    bounds = REGION_BOUNDS["서울"]
    lat_step, lng_step = bounds["step_lat"], bounds["step_lng"]
    
    lat = bounds["lat_min"]
    while lat <= bounds["lat_max"]:
        lng = bounds["lng_min"]
        while lng <= bounds["lng_max"]:
            all_gh.add(pgh.encode(lat, lng, precision=precision))
            lng += lng_step
        lat += lat_step
        
    result = sorted(list(all_gh))
    with open(SEOUL_GH_CACHE, "w", encoding="utf-8") as f:
        json.dump(result, f)
    print(f"✅ 총 {len(result)}개의 서울 광속 지오해시 구역 생성 완료!")
    return result

def setup_files_and_get_states() -> Dict[int, str]:
    os.makedirs(ITEM_DIR, exist_ok=True)
    os.makedirs(IMAGE_DIR, exist_ok=True)
    item_states = {}
    pattern = os.path.join(ITEM_DIR, "zigbang_items*.csv")
    prev_files = sorted(glob.glob(pattern))
    if prev_files:
        print(f"🔍 히스토리 데이터 파일 {len(prev_files)}개 분석 중...")
        for f_path in prev_files:
            try:
                with open(f_path, "r", encoding="utf-8-sig") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        iid = int(row["매물번호"]); item_states[iid] = row.get("상태", "ACTIVE")
            except Exception as e: print(f"⚠️ {os.path.basename(f_path)} 분석 실패: {e}")
        print(f"📊 누적 매물: {len(item_states)}개")
    else: print("📊 히스토리 없음. 새로운 데이터베이스를 구축합니다.")
    global ITEM_FILE, IMAGE_FILE
    now_str = datetime.now(KST).strftime("%Y%m%d_%H%M%S") # 초 단위 추가! 충돌 방지
    ITEM_FILE, IMAGE_FILE = os.path.join(ITEM_DIR, f"zigbang_items_{now_str}.csv"), os.path.join(IMAGE_DIR, f"zigbang_images_{now_str}.csv")
    ITEM_COLUMNS = ["매물번호", "상태", "매물_URL", "전체주소", "지번주소", "보증금", "월세", "관리비", "건물유형", "방타입", "전용면적_m2", "층", "총층", "위도", "경도", "대표이미지", "수집일시"]
    IMAGE_COLUMNS = ["매물번호", "이미지URL"]
    with open(ITEM_FILE, "w", newline="", encoding="utf-8-sig") as f: csv.DictWriter(f, fieldnames=ITEM_COLUMNS).writeheader()
    with open(IMAGE_FILE, "w", newline="", encoding="utf-8-sig") as f: csv.DictWriter(f, fieldnames=IMAGE_COLUMNS).writeheader()
    return item_states

def append_item(row):
    ITEM_COLUMNS = ["매물번호", "상태", "매물_URL", "전체주소", "지번주소", "보증금", "월세", "관리비", "건물유형", "방타입", "전용면적_m2", "층", "총층", "위도", "경도", "대표이미지", "수집일시"]
    with lock:
        with open(ITEM_FILE, "a", newline="", encoding="utf-8-sig") as f: csv.DictWriter(f, fieldnames=ITEM_COLUMNS).writerow(row)

def append_images(rows):
    IMAGE_COLUMNS = ["매물번호", "이미지URL"]
    with lock:
        with open(IMAGE_FILE, "a", newline="", encoding="utf-8-sig") as f: csv.DictWriter(f, fieldnames=IMAGE_COLUMNS).writerows(rows)

def get_item_ids(geohash: str) -> List[int]:
    # 🕵️ 초정밀 스텔스: 더 길게, 더 불규칙하게 쉬어주기 (차단 방지)
    time.sleep(random.uniform(0.5, 1.2))
    
    # 매번 다른 유저 에이전트 사용!
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "application/json",
        "Referer": "https://www.zigbang.com/",
    }
    
    try:
        res = session.get(ZIGBANG_API["geohash"], params={"geohash": geohash}, headers=headers, timeout=10)
        if res.status_code == 200: 
            return [i["itemId"] for i in res.json().get("items", [])]
        elif res.status_code == 403:
            print(f"🚫 IP 차단 감지 (403)! ({geohash})")
            return []
        else:
            print(f"⚠️ API Error ({geohash}): Status {res.status_code}")
    except Exception as e:
        print(f"❌ Network Error ({geohash}): {e}")
    return []

def get_detail(item_id: int) -> Optional[Dict]:
    try:
        url = ZIGBANG_API["item_detail"].format(item_id=item_id)
        res = session.get(url, headers=HEADERS, timeout=15)
        if res.status_code == 200: return res.json()
    except: pass
    return None

def transform(data: Dict, status: str = "ACTIVE") -> Tuple[Optional[Dict], List[Dict]]:
    item = data.get("item", {})
    if not item: return None, []
    item_id, addr = item.get("itemId"), item.get("jibunAddress", "")
    raw_imgs = item.get("images", [])
    images = [f"{img.strip()}?w=1200" for img in raw_imgs if img]
    item_row = {
        "매물번호": item_id, "상태": status, "매물_URL": f"https://www.zigbang.com/home/oneroom/items/{item_id}",
        "전체주소": addr, "지번주소": addr, "보증금": item.get("price", {}).get("deposit"), "월세": item.get("price", {}).get("rent"),
        "관리비": item.get("manageCost", {}).get("amount"), "건물유형": item.get("serviceType"), "방타입": item.get("roomType"),
        "전용면적_m2": item.get("area", {}).get("전용면적M2"), "층": item.get("floor", {}).get("floor"), "총층": item.get("floor", {}).get("allFloors"),
        "위도": item.get("location", {}).get("lat"), "경도": item.get("location", {}).get("lng"), "대표이미지": images[0] if images else "", "수집일시": datetime.now(KST).isoformat(),
    }
    image_rows = [{"매물번호": item_id, "이미지URL": img} for img in images]
    return item_row, image_rows

# ======================================================
# 메인
# ======================================================

def crawl():
    print("=" * 60)
    print("🏠 직방 전국 크롤링 & 상태 추적 시스템 (Turbo v2 + S3)")
    print(f"   실행 일시: {datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60 + "\n")

    start_total = time.time()
    item_states = setup_files_and_get_states()
    last_active_ids = {iid for iid, status in item_states.items() if status == "ACTIVE"}
    geohash_list = get_all_geohashes()
    print(f"📍 총 {len(geohash_list)}개의 지오해시 구역 분석 시작...")

    current_found_ids: Set[int] = set()
    print(f"🚀 ID 수집 중... (병렬 {ID_WORKERS}개)")
    with ThreadPoolExecutor(max_workers=ID_WORKERS) as executor:
        future_to_gh = {executor.submit(get_item_ids, gh): gh for gh in geohash_list}
        done_gh = 0
        for future in as_completed(future_to_gh):
            ids = future.result()
            if ids: current_found_ids.update(ids)
            done_gh += 1
            if done_gh % 200 == 0 or done_gh == len(geohash_list): print(f"   - 진행률: [{done_gh}/{len(geohash_list)}] ({done_gh/len(geohash_list)*100:.1f}%)")

    new_ids = current_found_ids - item_states.keys()
    reactivated_ids = (current_found_ids & item_states.keys()) - last_active_ids
    deleted_ids = last_active_ids - current_found_ids
    to_fetch_ids = new_ids | reactivated_ids

    print(f"\n🔍 분석 결과: 현재 {len(current_found_ids)}개 (신규 {len(new_ids)}, 재활성 {len(reactivated_ids)}, 삭제 {len(deleted_ids)})")

    if deleted_ids:
        # 실제로 활성(ACTIVE) 상태였던 놈들만 INACTIVE로 전환해서 기록해! 
        # (이미 죽은 놈은 또 죽일 필요 없으니까.)
        to_deactivate = [did for did in deleted_ids if item_states.get(did) == "ACTIVE"]
        if to_deactivate:
            print(f"🚫 {len(to_deactivate)}개의 매물을 INACTIVE 상태로 기록 중...")
            for did in to_deactivate: 
                append_item({"매물번호": did, "상태": "INACTIVE", "수집일시": datetime.now(KST).isoformat()})
        else:
            print("✨ 새로 삭제된 매물은 없네! (이미 INACTIVE 상태)")

    if to_fetch_ids:
        print(f"📋 상세 정보 수집 중... (대상: {len(to_fetch_ids)}개, 병렬 {MAX_WORKERS}개)")
        start_detail = time.time()
        done = 0
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {executor.submit(get_detail, iid): iid for iid in to_fetch_ids}
            for future in as_completed(futures):
                data = future.result(); done += 1
                if data:
                    item_row, image_rows = transform(data, status="ACTIVE")
                    if item_row: append_item(item_row); append_images(image_rows)
                if done % SAVE_INTERVAL == 0 or done == len(to_fetch_ids):
                    elapsed_detail = time.time() - start_detail
                    speed = done / elapsed_detail if elapsed_detail > 0 else 0
                    print(f"  [{done:5d}/{len(to_fetch_ids)}] 속도: {speed:.1f}/초")

    # 🚀 크롤링 종료 후 CSV 파일을 S3로 전송! (서울 전용 폴더)
    print("\n📦 서울 결과물을 S3로 업로드 중...")
    upload_to_s3(ITEM_FILE,  f"csv/seoul/item/{os.path.basename(ITEM_FILE)}")
    upload_to_s3(IMAGE_FILE, f"csv/seoul/image/{os.path.basename(IMAGE_FILE)}")

    # 🖼️ 서울 이미지 전용 다운로드 및 S3 직송!
    print("\n📸 [서울] 이미지 수집 및 S3 업로드 시작...")
    import download_images_seoul
    download_images_seoul.main(IMAGE_FILE)

    total_elapsed = time.time() - start_total
    print("\n" + "=" * 60)
    print("🎉 서울 수집 작업 완료!")
    print(f"   ⏱️  총 소요시간: {total_elapsed/60:.1f}분")
    print("=" * 60)

REGION_BOUNDS = {
    "서울": {"lat_min": 37.413, "lat_max": 37.715, "lng_min": 126.734, "lng_max": 127.269, "step_lat": 0.04, "step_lng": 0.04},
}

if __name__ == "__main__":
    crawl()
