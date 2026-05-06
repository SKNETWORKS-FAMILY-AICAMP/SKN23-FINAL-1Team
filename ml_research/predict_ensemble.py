import os
import pandas as pd
import numpy as np
from predict_catboost import CatBoostPredictor
from predict_lightgbm import LightGBMPredictor
from predict_randomforest import RandomForestPredictor
from predict_xgbboost import XGBoostPredictor

class EnsemblePredictor:
    def __init__(self):
        self.predictors = {}
        self._load_models()

    def _load_models(self):
        # 1. CatBoost
        cat_off = "ml_research/catboost/officetel_cbm_model_r2_0.946.cbm"
        if os.path.exists(cat_off): self.predictors['cat_off'] = CatBoostPredictor(cat_off)
        cat_one = "ml_research/catboost/oneroom_cbm_model_r2_0.848.cbm"
        if os.path.exists(cat_one): self.predictors['cat_one'] = CatBoostPredictor(cat_one)
        
        # 2. LightGBM
        lgb_off = "ml_research/lightGBM/lgbm_officetel_model.txt"
        if os.path.exists(lgb_off): self.predictors['lgb_off'] = LightGBMPredictor(lgb_off)
        lgb_one = "ml_research/lightGBM/lgbm_oneroom_model.txt"
        if os.path.exists(lgb_one): self.predictors['lgb_one'] = LightGBMPredictor(lgb_one)

        # 3. RandomForest (파일 생기면 자동 로드)
        rf_off = "ml_research/RandomForest/rf_officetel_model.joblib"
        if os.path.exists(rf_off): self.predictors['rf_off'] = RandomForestPredictor(rf_off)
        
        # 4. XGBoost (파일 생기면 자동 로드)
        xgb_off = "ml_research/xgbboost/xgb_officetel_model.json"
        if os.path.exists(xgb_off): self.predictors['xgb_off'] = XGBoostPredictor(xgb_off)
            
        print(f"총 {len(self.predictors)}개의 모델이 로드되었습니다.")

    def predict(self, df, model_type='officetel'):
        results = []
        
        if model_type == 'officetel':
            if 'cat_off' in self.predictors: results.append(self.predictors['cat_off'].predict(df))
            if 'lgb_off' in self.predictors: results.append(self.predictors['lgb_off'].predict(df))
            if 'rf_off' in self.predictors: results.append(self.predictors['rf_off'].predict(df))
            if 'xgb_off' in self.predictors: results.append(self.predictors['xgb_off'].predict(df))
        elif model_type == 'oneroom':
            if 'cat_one' in self.predictors: results.append(self.predictors['cat_one'].predict(df))
            if 'lgb_one' in self.predictors: results.append(self.predictors['lgb_one'].predict(df))
                
        if not results:
            return None
            
        # 단순 평균 (나중에 가중치 조절 가능)
        return np.mean(results, axis=0)

if __name__ == "__main__":
    ensemble = EnsemblePredictor()
    sample_data = pd.DataFrame([{
        "room_type": "원룸",
        "floor": "3",
        "all_floors": 5,
        "area_m2": 20.5,
        "bathroom_count": 1,
        "room_direction": "S",
        "address": "서울시 강남구 역삼동",
        "deposit": 1000,
        "rent": 60,
        "approve_date": "2020-01-01",
        "manage_cost": 5
    }])
    
    result = ensemble.predict(sample_data, model_type='officetel')
    if result is not None:
        print(f"앙상블 예측 결과: {result[0]:.2f} 만원")
    else:
        print("로드된 모델이 없어. 모델 파일 확인해봐.")
