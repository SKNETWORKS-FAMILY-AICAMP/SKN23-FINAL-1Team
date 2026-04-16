import os
import pandas as pd
import glob
from sqlalchemy import text
from db_connection import db_connection

def fix_info_data():
    # 1. CSV 파일 경로 설정 (ml_research 폴더 기준 상위 폴더의 zigbang_crawling)
    # 모든 CSV 파일을 읽어서 중복을 제거할 예정
    ITEM_CSV_DIR = "data/csv/item" 

    # 해당 폴더 내의 모든 csv 파일을 찾아서 복구 진행
    csv_files = glob.glob(os.path.join(ITEM_CSV_DIR, "zigbang_items_*.csv"))
    
    if not csv_files:
        print("하... 파일이 하나도 없잖아! 경로 똑바로 설정 안 해? 😤")
        print(f"찾아본 경로: {os.path.abspath(ITEM_CSV_DIR)}")
        return

    print(f"총 {len(csv_files)}개의 파일을 찾았어. 이제 주차 데이터 수집한다? 💉")

    # 2. 메모리 아끼기 위해 딕셔너리에 최신 정보만 담기 (중복 제거 핵심)
    repairing_map = {}
    
    for file in sorted(csv_files):
        try:
            print(f"   ㄴ [{os.path.basename(file)}] 읽는 중...")
            # status 컬럼을 포함해야 아래 조건문에서 에러가 안 난다! 😤
            df = pd.read_csv(file, usecols=['item_id', 'parking_available_text', "deposit", "rent", "status"], low_memory=False)
            
            for _, row in df.iterrows():
                if row["status"] == "ACTIVE":
                    item_id = row['item_id']
                    text_val = str(row['parking_available_text'])
                    deposit = int(row["deposit"]) if pd.notna(row["deposit"]) else 0
                    rent = int(row["rent"]) if pd.notna(row["rent"]) else 0
                    # '주차 가능' 문구가 포함되어 있으면 True
                    is_parking = True if '주차 가능' in text_val else False
                    repairing_map[item_id] = (is_parking, deposit, rent)
                
        except Exception as e:
            print(f"   ㄴ [파일 에러] {os.path.basename(file)}: {e}")

    if not repairing_map:
        print("하... 추출된 데이터가 하나도 없어. 헛수고했네? 😤")
        return

    # 3. 딕셔너리를 데이터프레임으로 변환 (리스트 컴프리헨션으로 깔끔하게!)
    data_list = [
        {'item_id': k, 'has_parking': v[0], 'deposit': v[1], 'rent': v[2]} 
        for k, v in repairing_map.items()
    ]
    update_df = pd.DataFrame(data_list)
    print(f"유니크한 매물 {len(update_df)}개 추출 완료. 이제 DB에 쏜다! 🚀")

    # 4. DB 업데이트 (임시 테이블 활용)
    engine = db_connection()
    try:
        with engine.begin() as conn:
            # 임시 테이블 생성 (매번 덮어쓰기)
            update_df.to_sql('tmp_info_fix', conn, if_exists='replace', index=False)
            
            # 1. item_features 테이블 업데이트
            sql_features = text("""
                UPDATE item_features f
                SET has_parking = t.has_parking
                FROM tmp_info_fix t
                WHERE f.item_id = t.item_id
            """)
            res_f = conn.execute(sql_features)
            print(f"   ㄴ item_features: {res_f.rowcount}개 갱신 완료")

            # 2. items 테이블 업데이트
            sql_items = text("""
                UPDATE items i
                SET deposit = t.deposit, rent = t.rent
                FROM tmp_info_fix t
                WHERE i.item_id = t.item_id
            """)
            res_i = conn.execute(sql_items)
            print(f"   ㄴ items: {res_i.rowcount}개 갱신 완료")
            
            # 임시 테이블 삭제
            conn.execute(text("DROP TABLE tmp_info_fix"))
            print("성공적으로 복구 완료! 고생 좀 했네. 😤")

            
    except Exception as e:
        print(f"야! DB 업데이트하다가 에러 났다! : {e}")

if __name__ == "__main__":
    fix_info_data()
