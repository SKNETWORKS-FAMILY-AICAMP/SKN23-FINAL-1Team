import os
import glob
from processor import fix_existing_images_to_s3

# 과거 이미지 CSV 파일들이 들어있는 폴더 경로
# 실제 데이터가 저장된 경로로 수정하세요.
IMAGE_CSV_DIR = "data/csv/image" 

# 해당 폴더 내의 모든 csv 파일을 찾아서 복구 진행
csv_files = glob.glob(os.path.join(IMAGE_CSV_DIR, "zigbang_images_*.csv"))

if not csv_files:
    print(f"[{IMAGE_CSV_DIR}] 폴더에서 복구할 CSV 파일을 찾지 못했습니다.")
    print("경로가 맞는지 다시 확인해 보세요!")
else:
    print(f"총 {len(csv_files)}개의 파일을 복구합니다...")
    for csv_file in sorted(csv_files):
        fix_existing_images_to_s3(csv_file)
    print("\n모든 데이터 복구 프로세스가 완료되었습니다!")
