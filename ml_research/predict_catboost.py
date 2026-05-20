import pandas as pd
import catboost
import os
from utils import preprocess_for_inference, align_features

class CatBoostPredictor:
    def __init__(self, model_path):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"모델 파일을 찾을 수 없어: {model_path}")
        self.model = catboost.CatBoostRegressor()
        self.model.load_model(model_path)
        print(f"CatBoost 모델 로드 완료: {model_path}")

    def predict(self, df):
        processed_df = preprocess_for_inference(df)
        # CatBoost는 범주형 데이터를 그대로 사용하므로 원핫 인코딩 없이 정렬만 수행
        X = align_features(processed_df, self.model.feature_names_)
        return self.model.predict(X)

if __name__ == "__main__":
    MODEL_PATH = "ml_research/catboost/officetel_cbm_model_r2_0.946.cbm"
    if os.path.exists(MODEL_PATH):
        predictor = CatBoostPredictor(MODEL_PATH)
        sample_data = pd.DataFrame([{
            "room_type": "원룸", "floor": "3", "all_floors": 5, "area_m2": 20.5,
            "bathroom_count": 1, "room_direction": "S", "address": "서울시 강남구 역삼동",
            "deposit": 1000, "rent": 60, "approve_date": "2020-01-01"
        }])
        print(f"CatBoost 예측: {predictor.predict(sample_data)[0]:.2f}")
