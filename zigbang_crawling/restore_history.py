import os
import glob
import processor

# 1. 과거 데이터가 들어있는 폴더 경로
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_DIR = os.path.join(BASE_DIR, "data", "csv", "item")

def restore():
    print("=" * 60)
    print("🚑 DB 데이터 심폐소생 시스템 (History Restoration)")
    print("=" * 60)

    # 2. 모든 매물 CSV 파일 목록 가져오기
    csv_files = sorted(glob.glob(os.path.join(CSV_DIR, "zigbang_items_*.csv")))

    if not csv_files:
        print("❌ 복구할 CSV 파일을 찾을 수 없습니다. 경로를 확인하세요.")
        return

    print(f"✅ 총 {len(csv_files)}개의 히스토리 파일을 발견했습니다.")
    
    # 3. 과거 파일부터 순차적으로 처리
    for i, f_path in enumerate(csv_files):
        filename = os.path.basename(f_path)
        print(f"\n[{i+1}/{len(csv_files)}] {filename} 복구 중...")
        
        try:
            # 아까 우리가 완벽하게 고친 그 함수를 호출!
            processor.load_single_csv_to_db(f_path)
        except Exception as e:
            print(f"⚠️ {filename} 처리 중 에러 발생: {e}")

    print("\n" + "=" * 60)
    print("🎉 모든 히스토리 복구 작업이 완료되었습니다!")
    print("   이제 DB에서 날아갔던 데이터들이 돌아왔는지 확인해 보세요.")
    print("=" * 60)

if __name__ == "__main__":
    restore()
