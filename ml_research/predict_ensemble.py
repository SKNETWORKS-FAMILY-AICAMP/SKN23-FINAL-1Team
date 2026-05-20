import os
import pandas as pd
import numpy as np
from predict_catboost import CatBoostPredictor
from predict_lightgbm import LightGBMPredictor
from predict_randomforest import RandomForestPredictor
from predict_xgbboost import XGBoostPredictor
from sklearn.metrics import r2_score, mean_squared_error

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

        # 3. RandomForest
        rf_off = "ml_research/RandomForest/officetel_random_forest_model.joblib"
        if os.path.exists(rf_off): self.predictors['rf_off'] = RandomForestPredictor(rf_off)
        rf_one = "ml_research/RandomForest/oneroom_random_forest_model.joblib"
        if os.path.exists(rf_one): self.predictors['rf_one'] = RandomForestPredictor(rf_one)
        
        # 4. XGBoost (경로 수정: xgboost)
        xgb_off = "ml_research/xgboost/xgb_officetel.json"
        if os.path.exists(xgb_off): self.predictors['xgb_off'] = XGBoostPredictor(xgb_off)
        xgb_one = "ml_research/xgboost/xgb_oneroom.json"
        if os.path.exists(xgb_one): self.predictors['xgb_one'] = XGBoostPredictor(xgb_one)
            
        print(f"총 {len(self.predictors)}개의 모델이 로드되었습니다.")

    def predict(self, df, model_type='officetel'):
        results = []
        
        if model_type == 'officetel':
            if 'cat_off' in self.predictors: results.append(self.predictors['cat_off'].predict(df))
            if 'lgb_off' in self.predictors: results.append(self.predictors['lgb_off'].predict(df))
            if 'rf_off' in self.predictors: results.append(self.predictors['rf_off'].predict(df))
            if 'xgb_off' in self.predictors: 
                pred = self.predictors['xgb_off'].predict(df)
                if pred is not None: results.append(pred)
        elif model_type == 'oneroom':
            if 'cat_one' in self.predictors: results.append(self.predictors['cat_one'].predict(df))
            if 'lgb_one' in self.predictors: results.append(self.predictors['lgb_one'].predict(df))
            if 'xgb_one' in self.predictors:
                pred = self.predictors['xgb_one'].predict(df)
                if pred is not None: results.append(pred)
                
        if not results:
            return None
            
        # 단순 평균
        return np.mean(results, axis=0)

if __name__ == "__main__":
    ensemble = EnsemblePredictor()
    
    # 평가용 데이터 경로
    data_paths = {
        'officetel': "/home/heartsping/SKN23-FINAL-1team/ml_research/processed_data/officetel_processed_items_data_2026-04-22.csv",
        'oneroom': "/home/heartsping/SKN23-FINAL-1team/ml_research/processed_data/oneroom_processed_items_data_2026-04-22.csv"
    }

    for model_type, path in data_paths.items():
        if os.path.exists(path):
            print(f"\n--- {model_type} 성능 평가 시작 ---")
            try:
                df = pd.read_csv(path)
                
                # 타겟 변수 분리
                if 'converted_monthly_rent' not in df.columns:
                    print(f"Error: {path} 에 'converted_monthly_rent' 컬럼이 없어!")
                    continue
                
                # 이상치 필터링 (현실적인 범위: 1000만원 이하)
                mask = df['converted_monthly_rent'] <= 1000
                df_filtered = df[mask].copy()
                if len(df_filtered) < len(df):
                    print(f"이상치 필터링됨: {len(df) - len(df_filtered)} 건 제거됨")
                
                y_true = df_filtered['converted_monthly_rent']
                
                # 예측 (앙상블)
                y_pred = ensemble.predict(df_filtered, model_type=model_type)
                
                if y_pred is not None and len(y_pred) == len(y_true):
                    # 성능 지표 계산
                    r2 = r2_score(y_true, y_pred)
                    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
                    
                    print(f"데이터 크기: {len(df)} 건")
                    print(f"R2 Score: {r2:.4f}")
                    print(f"RMSE: {rmse:.4f}")

                    # 이상치/결측치 체크
                    print(f"\n[데이터 품질 체크]")
                    print(f"True - NaN: {np.isnan(y_true).sum()}, Inf: {np.isinf(y_true).sum()}")
                    print(f"Pred - NaN: {np.isnan(y_pred).sum()}, Inf: {np.isinf(y_pred).sum()}")
                    print(f"True range: [{y_true.min():.2f}, {y_true.max():.2f}]")
                    print(f"Pred range: [{y_pred.min():.2f}, {y_pred.max():.2f}]")
                    
                    # 샘플 출력
                    print("\n[상위 10개 예측 결과 비교]")
                    comparison = pd.DataFrame({
                        'True': y_true[:10].values,
                        'Pred': y_pred[:10]
                    })
                    print(comparison)
                else:
                    print(f"{model_type} 모델로 예측할 수 없어 (로드된 모델 부족 또는 데이터 크기 불일치).")
            except Exception as e:
                import traceback
                print(f"{model_type} 평가 중 에러 발생: {e}")
                traceback.print_exc()
        else:
            print(f"파일을 찾을 수 없어: {path}")
