import pandas as pd
import numpy as np
import lightgbm as lgb
import os
from utils import preprocess_for_inference, align_features

class LightGBMPredictor:
    def __init__(self, model_path):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"모델 파일을 찾을 수 없어: {model_path}")
        self.model = lgb.Booster(model_file=model_path)
        print(f"LightGBM 모델 로드 완료: {model_path}")

    def predict(self, df):
        processed_df = preprocess_for_inference(df)
        X = align_features(processed_df, self.model.feature_name())
        # LightGBM은 로그 변환된 값으로 학습되었으므로 expm1 수행
        log_pred = self.model.predict(X)
        return np.expm1(log_pred)

if __name__ == "__main__":
    MODEL_PATH = "ml_research/lightGBM/lgbm_officetel_model.txt"
    if os.path.exists(MODEL_PATH):
        predictor = LightGBMPredictor(MODEL_PATH)
        sample_data = pd.DataFrame([{
            "room_type": "원룸", "floor": "3", "all_floors": 5, "area_m2": 20.5,
            "bathroom_count": 1, "room_direction": "S", "address": "서울시 강남구 역삼동",
            "deposit": 1000, "rent": 60, "approve_date": "2020-01-01"
        }])
        print(f"LightGBM 예측: {predictor.predict(sample_data)[0]:.2f}")
