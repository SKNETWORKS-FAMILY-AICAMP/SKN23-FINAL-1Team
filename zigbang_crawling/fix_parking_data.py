import os
import pandas as pd
import glob
from sqlalchemy import text
from db_connection import engine

def fix_parking_data():
    # 1. CSV 파일 경로 설정 (ml_research 폴더 기준 상위 폴더의 zigbang_crawling)
    # 모든 CSV 파일을 읽어서 중복을 제거할 예정
    ITEM_CSV_DIR = "data/csv/item" 

    # 해당 폴더 내의 모든 csv 파일을 찾아서 복구 진행
    csv_files = glob.glob(os.path.join(ITEM_CSV_DIR, "zigbang_images_*.csv"))
    
    if not csv_files:
        print("하... 파일이 하나도 없잖아! 경로 똑바로 설정 안 해? 😤")
        print(f"찾아본 경로: {os.path.abspath(ITEM_CSV_DIR)}")
        return

    print(f"총 {len(csv_files)}개의 파일을 찾았어. 이제 주차 데이터 수집한다? 💉")

    # 2. 메모리 아끼기 위해 딕셔너리에 최신 정보만 담기 (중복 제거 핵심)
    parking_map = {}
    
    for file in sorted(csv_files):
        try:
            print(f"   ㄴ [{os.path.basename(file)}] 읽는 중...")
            # 필요한 컬럼만 읽어서 메모리 절약
            df = pd.read_csv(file, usecols=['item_id', 'parking_available_text'], low_memory=False)
            
            for _, row in df.iterrows():
                item_id = row['item_id']
                text_val = str(row['parking_available_text'])
                # '주차 가능' 문구가 포함되어 있으면 True
                is_parking = True if '주차 가능' in text_val else False
                parking_map[item_id] = is_parking # 중복 ID는 마지막에 읽은 놈으로 덮어씌워짐
                
        except Exception as e:
            print(f"   ㄴ [파일 에러] {os.path.basename(file)}: {e}")

    if not parking_map:
        print("하... 추출된 데이터가 하나도 없어. 헛수고했네? 😤")
        return

    # 3. 딕셔너리를 데이터프레임으로 변환
    update_df = pd.DataFrame(list(parking_map.items()), columns=['item_id', 'has_parking'])
    print(f"유니크한 매물 {len(update_df)}개 추출 완료. 이제 DB에 쏜다! 🚀")

    # 4. DB 업데이트 (임시 테이블 활용)
    try:
        with engine.begin() as conn:
            # 임시 테이블 생성 (매번 덮어쓰기)
            update_df.to_sql('tmp_parking_fix', conn, if_exists='replace', index=False)
            
            # 원본 테이블(item_features) 업데이트 쿼리
            sql = text("""
                UPDATE item_features f
                SET has_parking = t.has_parking
                FROM tmp_parking_fix t
                WHERE f.item_id = t.item_id
            """)
            
            result = conn.execute(sql)
            print(f"성공! {result.rowcount}개의 매물 주차 정보가 갱신됐어. 😤")
            
            # 임시 테이블 삭제
            conn.execute(text("DROP TABLE tmp_parking_fix"))
            
    except Exception as e:
        print(f"야! DB 업데이트하다가 에러 났다! : {e}")

if __name__ == "__main__":
    fix_parking_data()
