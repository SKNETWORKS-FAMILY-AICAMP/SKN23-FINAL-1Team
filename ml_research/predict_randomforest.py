import pandas as pd
import numpy as np
import joblib
import os
from utils import preprocess_for_inference, align_features

class RandomForestPredictor:
    def __init__(self, model_path):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"모델 파일을 찾을 수 없어: {model_path}")
        
        loaded = joblib.load(model_path)
        
        # 만약 딕셔너리 형태로 저장되어 있다면 (모델+피처 리스트)
        if isinstance(loaded, dict):
            self.model = loaded.get("model")
            self.feature_names = loaded.get("features")
        else:
            self.model = loaded
            self.feature_names = getattr(self.model, "feature_names_in_", None)
            
        if self.model is None:
            raise ValueError(f"{model_path}에서 모델 객체를 찾을 수 없습니다.")
            
        print(f"RandomForest 모델 로드 완료: {model_path}")

    def predict(self, df):
        # 1. 전처리 (가짜 매물 필터링 포함)
        processed_df = preprocess_for_inference(df)
        if processed_df.empty:
            return np.array([])
        
        # 2. 피처 정렬 및 부족한 컬럼 채우기
        if self.feature_names is not None:
            X = align_features(processed_df, self.feature_names)
        else:
            print("Warning: 모델에 피처 정보가 없어. 학습 시 사용한 컬럼 순서가 틀릴 수 있어!")
            # 최소한 수치형 데이터라도 추출해서 시도
            X = processed_df.select_dtypes(include=[np.number])
        
        # 3. 예측
        return self.model.predict(X)

if __name__ == "__main__":
    MODEL_PATH = "ml_research/RandomForest/officetel_random_forest_model.joblib"
    if os.path.exists(MODEL_PATH):
        predictor = RandomForestPredictor(MODEL_PATH)
        sample_data = pd.DataFrame([{
            "room_type": "원룸", "floor": "3", "all_floors": 5, "area_m2": 20.5,
            "bathroom_count": 1, "room_direction": "S", "address": "서울시 강남구 역삼동",
            "deposit": 1000, "rent": 60, "approve_date": "2020-01-01",
            "room_quality_score": 8, "bath_clean_score": 8
        }])
        res = predictor.predict(sample_data)
        print(f"RandomForest 예측 결과: {res[0]:.2f} 만원")
    else:
        print(f"모델 파일이 없어: {MODEL_PATH}")
