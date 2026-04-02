import requests
import pandas as pd
import os
import time
import boto3
import glob
from botocore.exceptions import ClientError
from pathlib import Path
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm

# ================================================================
# S3 설정 (부모 폴더 포함)
# ================================================================

S3_BUCKET = "skn23-final-1team-355904321127-ap-northeast-2-an"
S3_PREFIX = "zigbang_data"
s3_client = boto3.client("s3")

def get_full_s3_path(s3_path: str) -> str:
    return f"{S3_PREFIX}/{s3_path}".replace("//", "/")

def check_s3_exists(s3_path: str) -> bool:
    try:
        s3_client.head_object(Bucket=S3_BUCKET, Key=get_full_s3_path(s3_path))
        return True
    except ClientError:
        return False

def upload_binary_to_s3(binary_data: bytes, s3_path: str, content_type: str = "image/jpeg"):
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=get_full_s3_path(s3_path),
            Body=binary_data,
            ContentType=content_type
        )
        return True
    except Exception as e:
        print(f"❌ S3 업로드 에러 ({s3_path}): {e}")
        return False

# ================================================================
# 설정 (CSV_PATH 자동 탐색 추가)
# ================================================================

MAX_WORKERS = 20
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "Referer": "https://www.zigbang.com/",
}

def get_ext(url):
    path = urlparse(url).path
    ext = os.path.splitext(path)[-1].split("?")[0].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]: ext = ".jpg"
    return ext

def download_and_upload_to_s3(args):
    url, item_id, filename = args
    s3_path = f"images/{item_id}/{filename}"
    if check_s3_exists(s3_path): return "skip"
    try:
        if "?" not in url: url = f"{url}?w=1200"
        res = requests.get(url, headers=HEADERS, timeout=15)
        if res.status_code == 200:
            ext = get_ext(url)
            content_type = f"image/{ext[1:]}" if ext.startswith(".") else "image/jpeg"
            if upload_binary_to_s3(res.content, s3_path, content_type): return "success"
        return f"fail_{res.status_code}"
    except Exception as e: return f"error_{e}"

def main():
    # 최신 이미지 CSV 자동 탐색
    pattern = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data/csv/image/zigbang_images_*.csv")
    files = sorted(glob.glob(pattern))
    if not files:
        print("❌ 분석할 이미지 CSV 파일이 없습니다.")
        return
    
    full_csv_path = Path(files[-1])
    print(f"📂 최신 CSV 로드: {full_csv_path.name}")
    
    df = pd.read_csv(full_csv_path, encoding="utf-8-sig")
    col_id = next((c for c in df.columns if any(k in c.lower() for k in ["매물", "id", "번호"])), None)
    col_url = next((c for c in df.columns if any(k in c.lower() for k in ["url", "이미지", "image"])), None)

    if not col_id or not col_url:
        print("❌ 컬럼 감지 실패"); return

    tasks = []
    for _, row in df.iterrows():
        item_id, url = str(row[col_id]), str(row[col_url]).strip()
        if not url or url == "nan": continue
        tasks.append((url, item_id))

    df_tasks = pd.DataFrame(tasks, columns=['url', 'item_id'])
    final_tasks = []
    for item_id, group in df_tasks.groupby('item_id'):
        for i, (_, row) in enumerate(group.iterrows(), 1):
            url = row['url']
            final_tasks.append((url, item_id, f"{item_id}_{i}{get_ext(url)}"))

    print(f"📦 총 {len(final_tasks)}개 이미지 S3 직송 시작 (병렬 {MAX_WORKERS})\n")
    success, skip, fail = 0, 0, 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_task = {executor.submit(download_and_upload_to_s3, task): task for task in final_tasks}
        with tqdm(total=len(final_tasks), desc="S3 업로드 중", unit="img") as pbar:
            for future in as_completed(future_to_task):
                result = future.result()
                if result == "success": success += 1
                elif result == "skip": skip += 1
                else: fail += 1
                pbar.update(1)

    print("\n" + "=" * 50)
    print("🎉 S3 직송 완료!")
    print(f"   ✅ 성공: {success} / ⏭️  스킵: {skip} / ❌ 실패: {fail}")
    print(f"   ☁️  S3 경로: s3://{S3_BUCKET}/{S3_PREFIX}/")
    print("=" * 50)

if __name__ == "__main__":
    main()
