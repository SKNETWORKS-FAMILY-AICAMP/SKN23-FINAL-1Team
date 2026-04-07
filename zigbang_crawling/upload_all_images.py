import os
import glob
import processor  # 우리가 만든 그 튼튼한 모듈!

def run_all_image_uploads():
    # 이미지 CSV 파일들이 모여있는 경로
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    IMAGE_DIR = os.path.join(BASE_DIR, "data", "csv", "image")
    
    # zigbang_images_로 시작하는 모든 CSV 파일 찾기
    csv_pattern = os.path.join(IMAGE_DIR, "zigbang_images_*.csv")
    csv_files = sorted(glob.glob(csv_pattern))
    
    if not csv_files:
        print(f"[{IMAGE_DIR}] 폴더에 처리할 이미지 CSV 파일이 하나도 없는데?")
        return

    print(f"총 {len(csv_files)}개의 과거 이미지 파일을 발견했어. 작업을 시작한다!")
    
    for i, csv_file in enumerate(csv_files):
        print(f"\n({i+1}/{len(csv_files)}) 작업 중...")
        try:
            # 우리가 processor.py에 만들어둔 그 함수 호출!
            processor.load_images_to_db(csv_file)
        except Exception as e:
            print(f"에러 발생 ({os.path.basename(csv_file)}): {e}")

    print("\n" + "=" * 50)
    print("모든 과거 이미지 URL 데이터가 DB에 반영됐어! 고생했다 임마.")
    print("=" * 50)

if __name__ == "__main__":
    run_all_image_uploads()
