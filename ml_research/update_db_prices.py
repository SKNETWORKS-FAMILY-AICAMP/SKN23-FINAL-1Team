import os
import sys
import pandas as pd
import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

# 프로젝트 루트를 path에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from predict_ensemble import EnsemblePredictor
from utils import calculate_actual_converted_rent
from db_connection import db_connection

def update_prices():
    print("앙상블 모델 로딩 중...")
    ensemble = EnsemblePredictor()
    
    print("DB 연결 중...")
    engine = db_connection()
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        print("DB에서 매물 데이터 조회 중...")
        query = """
    WITH room_agg AS (
        SELECT
            img.item_id,
            AVG(emb.normalized_room_score) as room_quality_score
        FROM item_images img
        JOIN item_image_embeddings emb ON img.id = emb.image_id
        WHERE emb.room_score >= 0.24
        GROUP BY img.item_id
    ),
    bath_agg AS (
        SELECT
            img.item_id,
            emb.normalized_bathroom_score as bath_clean_score
        FROM item_images img
        JOIN item_image_embeddings emb ON img.id = emb.image_id
        WHERE emb.is_bathroom = TRUE
    )
    SELECT
        i.item_id,
        i.address, i.deposit, i.rent, i.manage_cost, i.service_type, i.room_type,
        i.floor, i.all_floors, i.area_m2, i.first_crawled_at,
        t.has_parking, t.has_elevator, t.bathroom_count, t.room_direction,
        t.movein_date, t.approve_date, t.has_air_con, t.has_fridge, t.has_washer,
        t.has_gas_stove, t.has_induction, t.has_microwave, t.has_desk, t.has_bed,
        t.has_closet, t.has_shoe_rack, t.dist_subway, t.dist_pharmacy, t.dist_conv,
        t.dist_bus, t.dist_mart, t.dist_laundry, t.dist_cafe, t.is_coupang,
        t.is_ssg, t.is_marketkurly, t.is_baemin, t.is_yogiyo, t.is_subway_area,
        t.is_convenient_area, t.is_park_area, t.is_school_area, t.has_bookcase,
        t.has_sink,
        r.room_quality_score,
        b.bath_clean_score
    FROM items i
    INNER JOIN item_features t ON i.item_id = t.item_id
    LEFT JOIN room_agg r ON i.item_id = r.item_id
    LEFT JOIN bath_agg b ON i.item_id = b.item_id;
    """
        raw_df = pd.read_sql(query, engine)
        
        if raw_df.empty:
            print("처리할 매물이 없습니다.")
            return

        print(f"총 {len(raw_df)}개의 매물 중 가짜 매물 필터링 중...")
        
        # [해결책] 여기서 미리 필터링해서 길이를 확정짓는다!
        # 품질 점수나 방향이 없는 '가짜 매물'은 아예 제외
        df = raw_df.dropna(subset=["room_quality_score", "room_direction"]).copy()
        skipped_count = len(raw_df) - len(df)
        print(f"가짜 매물 {skipped_count}개 제외 완료. {len(df)}개에 대해 처리 시작...")

        # 3. 실제 환산 월세 계산
        df['actual_converted_rent'] = calculate_actual_converted_rent(df)

        # 4. 앙상블 가격 예측
        officetel_mask = df['service_type'] == '오피스텔'
        oneroom_mask = (df['service_type'] != '오피스텔') & (df['service_type'] != '쓰리룸')
        df['predicted_price'] = np.nan
        
        if officetel_mask.any():
            print(f"오피스텔 {officetel_mask.sum()}개 예측 중...")
            # 이제 모델 안에서 데이터가 안 잘리니까 에러 안 날 거야!
            df.loc[officetel_mask, 'predicted_price'] = ensemble.predict(df[officetel_mask], model_type='officetel')
            
        if oneroom_mask.any():
            print(f"원룸 {oneroom_mask.sum()}개 예측 중...")
            df.loc[oneroom_mask, 'predicted_price'] = ensemble.predict(df[oneroom_mask], model_type='oneroom')

        # 5. 추천도(가성비 지수) 계산
        df['recommendation_score'] = (df['predicted_price'] / (df['actual_converted_rent'] + 1e-9)) * 100
        df['recommendation_score'] = df['recommendation_score'].clip(upper=100).round(2)

        # 6. 결과 요약
        print("\n[예측 및 추천 점수 산출 완료]")
        summary = df.dropna(subset=['predicted_price'])
        print(summary[['item_id', 'service_type', 'actual_converted_rent', 'predicted_price', 'recommendation_score']].head(10))
        
        print(f"\n성공: {len(summary)}개 / 제외됨: {skipped_count}개")
        print("DB에 'recommendation_score' 컬럼 추가 후 업데이트를 진행하세요.")

    except Exception as e:
        print(f"오류 발생: {e}")
        import traceback
        traceback.print_exc() # 어디서 터졌는지 자세히 보자!
    finally:
        session.close()
        engine.dispose()

if __name__ == "__main__":
    update_prices()
