import catboost
import lightgbm as lgb
import os

def check_models():
    cat_officetel_path = "ml_research/catboost/officetel_cbm_model_r2_0.946.cbm"
    cat_oneroom_path = "ml_research/catboost/oneroom_cbm_model_r2_0.848.cbm"
    lgb_officetel_path = "ml_research/lightGBM/lgbm_officetel_model.txt"
    lgb_oneroom_path = "ml_research/lightGBM/lgbm_oneroom_model.txt"

    print("--- CatBoost Officetel ---")
    if os.path.exists(cat_officetel_path):
        model = catboost.CatBoostRegressor()
        model.load_model(cat_officetel_path)
        print("Features:", model.feature_names_)
    
    print("\n--- LightGBM Officetel ---")
    if os.path.exists(lgb_officetel_path):
        model = lgb.Booster(model_file=lgb_officetel_path)
        print("Features:", model.feature_name())

if __name__ == "__main__":
    try:
        check_models()
    except Exception as e:
        print(f"Error: {e}")
