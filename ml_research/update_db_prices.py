import os
import sys
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# 프로젝트 루트를 path에 추가
sys.path.append(os.getcwd())

from ml_research.predict_ensemble import EnsemblePredictor
from ml_research.utils import calculate_actual_converted_rent
from backend.db.session import DATABASE_URL

def update_prices():
    print("앙상블 모델 로딩 중...")
    ensemble = EnsemblePredictor()
    
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        print("DB에서 매물 데이터 조회 중...")
        # (쿼리는 이전과 동일하므로 생략하거나 유지)
        query = """
            SELECT 
                i.*, 
                f.has_parking, f.parking_count, f.has_elevator, f.bathroom_count,
                f.residence_type, f.room_direction, f.movein_date, f.approve_date,
                f.has_air_con, f.has_fridge, f.has_washer, f.has_gas_stove,
                f.has_induction, f.has_microwave, f.has_desk, f.has_bed,
                f.has_closet, f.has_shoe_rack, f.dist_subway, f.dist_pharmacy,
                f.dist_conv, f.dist_bus, f.dist_mart, f.dist_laundry, f.dist_cafe,
                f.is_coupang, f.is_ssg, f.is_marketkurly, f.is_baemin, f.is_yogiyo,
                f.is_subway_area, f.is_convenient_area, f.is_park_area, f.is_school_area,
                f.has_bookcase, f.has_sink,
                f.room_quality_score, f.bath_clean_score
            FROM public.items i
            LEFT JOIN public.item_features f ON i.item_id = f.item_id
            WHERE i.status = 'ACTIVE'
        """
        df = pd.read_sql(query, engine)
        
        if df.empty:
            print("처리할 매물이 없습니다.")
            return

        # 1. 실제 환산 월세 계산
        df['actual_converted_rent'] = calculate_actual_converted_rent(df)

        # 2. 앙상블 가격 예측
        officetel_mask = df['service_type'] == '오피스텔'
        oneroom_mask = df['service_type'] == '원룸'
        df['predicted_price'] = np.nan
        
        if officetel_mask.any():
            df.loc[officetel_mask, 'predicted_price'] = ensemble.predict(df[officetel_mask], model_type='officetel')
        if oneroom_mask.any():
            df.loc[oneroom_mask, 'predicted_price'] = ensemble.predict(df[oneroom_mask], model_type='oneroom')

        # 3. 추천도(가성비 지수) 계산
        # 공식: (예측 적정가 / 실제 환산가) * 100
        # 100점 만점 기준으로 정규화 (예: 적정가보다 쌀수록 100점에 수렴하도록 설계 가능)
        # 여기서는 직관적으로 가성비 비율로 계산함
        df['recommendation_score'] = (df['predicted_price'] / (df['actual_converted_rent'] + 1e-9)) * 100
        
        # 0~100점 사이로 클리핑 (너무 튀는 값 방지)
        df['recommendation_score'] = df['recommendation_score'].clip(upper=100).round(2)

        print("\n[예측 결과 요약]")
        summary = df.dropna(subset=['predicted_price'])
        print(summary[['item_id', 'deposit', 'rent', 'actual_converted_rent', 'predicted_price', 'recommendation_score']].head(10))
        
        print(f"\n총 {len(summary)}개의 매물 추천 점수 산출 완료!")

    finally:
        session.close()

if __name__ == "__main__":
    update_prices()
