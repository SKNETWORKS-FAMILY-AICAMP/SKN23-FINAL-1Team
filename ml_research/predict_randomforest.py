import pandas as pd
import numpy as np
import joblib
import os

class RandomForestPredictor:
    def __init__(self, model_path):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"모델 파일을 찾을 수 없어: {model_path}")
        self.model = joblib.load(model_path)
        print(f"RandomForest 모델 로드 완료: {model_path}")

    def preprocess(self, df):
        # RandomForest도 원핫 인코딩된 수치형 데이터를 사용함
        df = df.copy()
        
        # 1. 지역 추출 등 전처리 (기존과 동일하게 수행한다고 가정)
        # 실제로는 공통 전처리 모듈을 만드는 게 좋음
        
        # 2. 피처 정렬 및 부족한 컬럼 채우기
        # sklearn 모델은 feature_names_in_ 속성이 있을 수 있음
        if hasattr(self.model, "feature_names_in_"):
            features = self.model.feature_names_in_
        else:
            # 모델 저장 시 피처 리스트를 같이 저장하지 않았다면 수동으로 관리해야 함
            print("Warning: 모델에 피처 정보가 없어. 외부에서 넣어줘야 할지도?")
            return df
        
        # 범주형 컬럼들 원핫 인코딩
        cat_cols = ["room_type", "room_direction", "district", "contract_class"]
        df_encoded = pd.get_dummies(df, columns=[c for c in cat_cols if c in df.columns])
        
        for col in features:
            if col not in df_encoded.columns:
                df_encoded[col] = 0
                
        return df_encoded[features]

    def predict(self, df):
        X = self.preprocess(df)
        # RF 모델이 로그 변환된 타겟으로 학습되었는지 확인 필요
        return self.model.predict(X)

if __name__ == "__main__":
    # 나중에 모델 파일(.joblib) 생기면 경로 맞춰서 테스트해봐
    MODEL_PATH = "ml_research/RandomForest/rf_officetel_model.joblib"
    if os.path.exists(MODEL_PATH):
        predictor = RandomForestPredictor(MODEL_PATH)
        # ... 테스트 코드
    else:
        print("RF 모델 파일 아직 없지? 파일 생기면 그때 다시 얘기해.")
