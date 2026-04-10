import os
import pandas as pd
import glob
from datetime import datetime
from zoneinfo import ZoneInfo
from discord_utils import send_crawler_report

# KST 타임존 설정
KST = ZoneInfo("Asia/Seoul")

def run_daily_summary():
    date_str_file = datetime.now(KST).strftime("%Y%m%d") # 파일명용 (20240408)
    date_str_display = datetime.now(KST).strftime("%Y-%m-%d") # 표시용 (2024-04-08)
    
    # 경로 설정
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    ITEM_DIR = os.path.join(BASE_DIR, "data", "csv", "item")
    IMAGE_DIR = os.path.join(BASE_DIR, "data", "csv", "image")
    
    # 1. 매물 데이터 요약 (오늘 생성된 파일)
    item_file = os.path.join(ITEM_DIR, f"zigbang_items_{date_str_file}.csv")
    new_active = 0
    new_inactive = 0
    
    if os.path.exists(item_file):
        try:
            df_items = pd.read_csv(item_file, encoding="utf-8-sig")
            # 오늘 파일에서 ACTIVE와 INACTIVE 개수 카운트
            new_active = len(df_items[df_items['status'] == 'ACTIVE'])
            new_inactive = len(df_items[df_items['status'] == 'INACTIVE'])
        except Exception as e:
            print(f"매물 CSV 읽기 에러: {e}")
    
    # 2. 이미지 데이터 요약 (오늘 생성된 모든 이미지 CSV 합산)
    image_pattern = os.path.join(IMAGE_DIR, f"zigbang_images_{date_str_file}_*.csv")
    image_files = glob.glob(image_pattern)
    total_images_found = 0
    
    for f in image_files:
        try:
            df_img = pd.read_csv(f, encoding="utf-8-sig")
            total_images_found += len(df_img)
        except:
            pass
            
    # 3. 리포트 생성 및 전송
    if new_active == 0 and new_inactive == 0 and total_images_found == 0:
        print("오늘 수집된 데이터가 없어서 리포트를 보내지 않습니다.")
        return

    stats = {
        "✨ 신규 매물 (ACTIVE)": f"{new_active}개",
        "🗑️ 삭제 매물 (INACTIVE)": f"{new_inactive}개",
        "📸 발견된 이미지": f"{total_images_found}개",
        "📅 기준일": date_str_display
    }
    
    send_crawler_report("🏠 직방 서울 수집 일일 결산", stats, color=0xf1c40f)
    print(f"일일 결산 리포트 전송 완료! ({date_str_display})")

if __name__ == "__main__":
    run_daily_summary()
