import pandas as pd
import numpy as np
import xgboost as xgb
import os

class XGBoostPredictor:
    def __init__(self, model_path):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"모델 파일을 찾을 수 없어: {model_path}")
        self.model = xgb.XGBRegressor()
        self.model.load_model(model_path)
        print(f"XGBoost 모델 로드 완료: {model_path}")

    def preprocess(self, df):
        df = df.copy()
        
        # XGBoost도 보통 원핫 인코딩된 데이터를 사용함
        # 모델의 feature_names 속성 확인
        if hasattr(self.model, "get_booster"):
            features = self.model.get_booster().feature_names
        else:
            print("Warning: XGBoost 피처 정보 확인 불가")
            return df
            
        cat_cols = ["room_type", "room_direction", "district", "contract_class"]
        df_encoded = pd.get_dummies(df, columns=[c for c in cat_cols if c in df.columns])
        
        for col in features:
            if col not in df_encoded.columns:
                df_encoded[col] = 0
                
        return df_encoded[features]

    def predict(self, df):
        X = self.preprocess(df)
        # XGBoost 노트북에서 np.log1p를 썼는지 확인 필요
        return self.model.predict(X)

if __name__ == "__main__":
    MODEL_PATH = "ml_research/xgbboost/xgb_officetel_model.json"
    if os.path.exists(MODEL_PATH):
        predictor = XGBoostPredictor(MODEL_PATH)
        # ... 테스트
    else:
        print("XGBoost 모델 파일도 아직이네. 준비되면 말해.")
