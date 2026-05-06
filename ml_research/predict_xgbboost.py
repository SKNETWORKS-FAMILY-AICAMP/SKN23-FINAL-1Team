import pandas as pd
import numpy as np
import xgboost as xgb
import os
from utils import preprocess_for_inference, align_features

class XGBoostPredictor:
    def __init__(self, model_path):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"모델 파일을 찾을 수 없어: {model_path}")
        self.model = xgb.XGBRegressor()
        self.model.load_model(model_path)
        
        # 모델에서 피처 이름 추출
        self.feature_names = self.model.get_booster().feature_names
        if self.feature_names is None:
            print(f"Warning: {model_path} 모델에 피처 이름 정보가 없습니다.")
            
        print(f"XGBoost 모델 로드 완료: {model_path}")

    def predict(self, df):
        if self.feature_names is None:
            print("피처 이름 정보가 없어서 예측을 진행할 수 없어. 모델 저장할 때 피처 이름도 같이 저장된 거 맞아?")
            return None
            
        # 1. 전처리 (가짜 매물 필터링 포함)
        processed_df = preprocess_for_inference(df)
        if processed_df.empty:
            return np.array([])
            
        # 2. 피처 정렬 (원핫 인코딩 포함)
        X = align_features(processed_df, self.feature_names)
        
        # 3. 예측 (XGBoost는 보통 log1p로 학습되었을 확률이 높음, 노트북 확인 결과)
        log_pred = self.model.predict(X)
        return np.expm1(log_pred)

if __name__ == "__main__":
    MODEL_PATH = "ml_research/xgboost/xgb_officetel.json"
    if os.path.exists(MODEL_PATH):
        predictor = XGBoostPredictor(MODEL_PATH)
        sample_data = pd.DataFrame([{
            "room_type": "원룸", "floor": "3", "all_floors": 5, "area_m2": 20.5,
            "bathroom_count": 1, "room_direction": "S", "address": "서울시 강남구 역삼동",
            "deposit": 1000, "rent": 60, "approve_date": "2020-01-01",
            "room_quality_score": 8, "bath_clean_score": 8
        }])
        res = predictor.predict(sample_data)
        if res is not None:
            print(f"XGBoost 예측 결과: {res[0]:.2f} 만원")
    else:
        print(f"모델 파일이 없어: {MODEL_PATH}")
