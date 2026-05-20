import os
import sys
import pandas as pd
import numpy as np
from sqlalchemy import text, MetaData, Table
from sqlalchemy.orm import sessionmaker

# 프로젝트 루트를 path에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from predict_xgbboost import XGBoostPredictor
from utils import calculate_actual_converted_rent
from db_connection import db_connection

def update_prices():
    print("XGBoost 모델 로딩 중...")
    xgb_off = XGBoostPredictor("ml_research/xgboost/xgb_officetel.json")
    xgb_one = XGBoostPredictor("ml_research/xgboost/xgb_oneroom.json")
    
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
        df = raw_df.dropna(subset=["room_quality_score", "room_direction"]).copy()
        skipped_count = len(raw_df) - len(df)
        print(f"가짜 매물 {skipped_count}개 제외 완료. {len(df)}개에 대해 처리 시작...")

        # 3. 실제 환산 월세 계산
        df['actual_converted_rent'] = calculate_actual_converted_rent(df)

        # 4. XGBoost 가격 예측
        officetel_mask = df['service_type'] == '오피스텔'
        oneroom_mask = ~df['service_type'].isin(['오피스텔', '쓰리룸'])
        df['predicted_price'] = np.nan
        
        if officetel_mask.any():
            print(f"오피스텔 {officetel_mask.sum()}개 예측 중...")
            df.loc[officetel_mask, 'predicted_price'] = xgb_off.predict(df[officetel_mask])
            
        if oneroom_mask.any():
            print(f"원룸/투룸군 {oneroom_mask.sum()}개 예측 중...")
            df.loc[oneroom_mask, 'predicted_price'] = xgb_one.predict(df[oneroom_mask])

        # 5. 추천도(가성비 지수) 계산
        df['recommendation_score'] = (df['predicted_price'] / (df['actual_converted_rent'] + 1e-9)) * 100
        df['recommendation_score'] = df['recommendation_score'].clip(upper=120).round(2)

        # 6. 결과 요약 및 백업
        summary = df.dropna(subset=['predicted_price']).copy()
        print("\n[산출 완료] 상위 5개 결과:")
        print(summary[['item_id', 'service_type', 'actual_converted_rent', 'predicted_price', 'recommendation_score']].head())
        
        # 만약을 대비해 CSV로 먼저 저장!
        backup_path = "calculated_recommendation_scores.csv"
        summary[['item_id', 'recommendation_score']].to_csv(backup_path, index=False)
        print(f"\n데이터 백업 완료: {backup_path}")

        # 7. 진짜 DB 업데이트 실행
        print("\nDB 업데이트 시작 (Bulk Update)...")
        
        # 업데이트용 데이터 리스트 생성 (item_id 기준으로 매칭)
        update_data = [
            {"b_item_id": int(row['item_id']), "b_score": float(row['recommendation_score'])}
            for _, row in summary.iterrows()
        ]
        
        # 직접 SQL 벌크 업데이트 쿼리 (가장 빠름)
        # 주의: DB에 recommendation_score 컬럼이 미리 생성되어 있어야 함!
        stmt = text("UPDATE public.items SET recommendation_score = :b_score WHERE item_id = :b_item_id")
        
        chunk_size = 1000
        total_updated = 0
        for i in range(0, len(update_data), chunk_size):
            chunk = update_data[i:i + chunk_size]
            session.execute(stmt, chunk)
            session.commit()
            total_updated += len(chunk)
            print(f"진행 중... {total_updated}/{len(update_data)} 완료", end='\r')

        print(f"\n\n최종 성공: {total_updated}개의 매물 추천 점수 반영 완료!")

    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()
        engine.dispose()

if __name__ == "__main__":
    update_prices()
