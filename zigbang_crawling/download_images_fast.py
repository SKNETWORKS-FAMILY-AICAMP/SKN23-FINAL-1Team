import requests
import pandas as pd
import os
import time
from pathlib import Path
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm

# ================================================================
# 직방 이미지 고속 다운로더 (Multi-threaded)
# CSV 파일에서 매물번호 + 이미지 URL 읽어서 폴더별로 병렬 다운로드
# ================================================================

CSV_PATH = "인천_images.csv"  # 대소문자 주의 (WSL은 구분함)
SAVE_DIR = f"data/images/{CSV_PATH[:2]}"
MAX_WORKERS = 10  # 동시에 다운로드할 개수 (너무 많으면 차단당하니 적당히!)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "Referer": "https://www.zigbang.com/",
}

def get_ext(url):
    """URL에서 확장자 추출"""
    path = urlparse(url).path
    ext = os.path.splitext(path)[-1].split("?")[0].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        ext = ".jpg"
    return ext

def download_single_image(args):
    """이미지 하나 다운로드 작업 유닛"""
    url, save_path, item_id, filename = args
    
    # 이미 다운로드된 파일은 스킵
    if save_path.exists():
        return "skip"

    try:
        # URL에 w 파라미터 없으면 추가
        if "?" not in url:
            url = f"{url}?w=1200"

        res = requests.get(url, headers=HEADERS, timeout=15)
        if res.status_code == 200:
            with open(save_path, "wb") as f:
                f.write(res.content)
            return "success"
        else:
            return f"fail_{res.status_code}"
    except Exception as e:
        return f"error_{e}"

def main():
    # CSV 읽기 (경로 수정 및 인코딩 확인)
    full_csv_path = Path(CSV_PATH)
    if not full_csv_path.exists():
        print(f"❌ CSV 파일을 찾을 수 없어요: {full_csv_path}")
        return

    print(f"📂 CSV 읽는 중: {full_csv_path}")
    try:
        df = pd.read_csv(full_csv_path, encoding="utf-8-sig")
    except UnicodeDecodeError:
        df = pd.read_csv(full_csv_path, encoding="cp949")
        
    print(f"   총 {len(df)}행 로드됨")

    # 컬럼명 자동 감지
    col_id = next((c for c in df.columns if any(k in c.lower() for k in ["매물", "id", "번호"])), None)
    col_url = next((c for c in df.columns if any(k in c.lower() for k in ["url", "이미지", "image"])), None)

    if not col_id or not col_url:
        print(f"❌ 컬럼 자동 감지 실패. 컬럼 목록: {list(df.columns)}")
        return

    print(f"✅ 매물번호 컬럼: '{col_id}', 이미지 URL 컬럼: '{col_url}'\n")

    # 저장 폴더 생성
    Path(SAVE_DIR).mkdir(parents=True, exist_ok=True)

    # 다운로드 작업 목록 생성
    tasks = []
    grouped = df.groupby(col_id)
    
    for item_id, group in grouped:
        folder = Path(SAVE_DIR) / str(item_id)
        folder.mkdir(parents=True, exist_ok=True)
        
        for i, (_, row) in enumerate(group.iterrows(), 1):
            url = str(row[col_url]).strip()
            if not url or url == "nan":
                continue
                
            ext = get_ext(url)
            filename = f"{item_id}_{i}{ext}"
            save_path = folder / filename
            tasks.append((url, save_path, item_id, filename))

    print(f"📦 총 {len(tasks)}개 이미지 병렬 다운로드 시작 (동시 작업 수: {MAX_WORKERS})\n")

    success = 0
    skip = 0
    fail = 0

    # ThreadPoolExecutor로 고속 다운로드
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # tqdm으로 진행바 표시
        future_to_task = {executor.submit(download_single_image, task): task for task in tasks}
        
        with tqdm(total=len(tasks), desc="다운로드 중", unit="img") as pbar:
            for future in as_completed(future_to_task):
                result = future.result()
                if result == "success":
                    success += 1
                elif result == "skip":
                    skip += 1
                else:
                    fail += 1
                    # 실패 로그는 가끔씩만 출력하거나 생략 가능
                pbar.update(1)

    print("\n" + "=" * 50)
    print("🎉 고속 다운로드 완료!")
    print(f"   ✅ 성공: {success}개")
    print(f"   ⏭️  스킵: {skip}개")
    print(f"   ❌ 실패: {fail}개")
    print(f"   📁 저장 위치: {SAVE_DIR}")

if __name__ == "__main__":
    main()
