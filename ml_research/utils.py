import pandas as pd
import numpy as np
import os

def preprocess_for_inference(df, drop_invalid=False):
    """
    추론을 위한 공통 전처리 로직.
    기본적으로 데이터를 버리지 않고(drop_invalid=False), 결측치 처리에 집중함.
    배치 작업 시에는 호출 전 미리 필터링하는 것을 권장.
    """
    df = df.copy()
    
    # 1. 필수 값 체크 (가짜 매물 걸러내기)
    # 사용자가 정의한 기준: room_quality_score, room_direction이 없으면 비정상 데이터
    if drop_invalid:
        essential_cols = ["room_quality_score", "room_direction"]
        # 존재하는 컬럼에 대해서만 수행 (에러 방지)
        cols_to_check = [c for c in essential_cols if c in df.columns]
        df = df.dropna(subset=cols_to_check)
        
    if df.empty:
        return df

    # 2. 지역(district) 추출
    if "address" in df.columns:
        df["district"] = df["address"].str.split().str[0]
        df.loc[df["district"].str.contains("서울시"), "district"] = df["address"].str.split().str[1]
        seoul_gu_set = {
            '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구',
            '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구',
            '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'
        }
        df.loc[~df["district"].isin(seoul_gu_set), "district"] = "기타"
    
    # 3. 화장실 개수 정상화
    if 'bathroom_count' in df.columns:
        df['bathroom_count'] = pd.to_numeric(df['bathroom_count'], errors='coerce').fillna(1)
        df.loc[df['bathroom_count'] == 0, 'bathroom_count'] = 1
        df.loc[df['bathroom_count'] > 2, 'bathroom_count'] = 2
    
    # 4. 입주 가능일 처리
    if 'movein_date' in df.columns:
        df['movein_date_dt'] = pd.to_datetime(df['movein_date'], errors='coerce')
        today = pd.Timestamp.now()
        df['movein_days'] = (df['movein_date_dt'].fillna(today) - today).dt.days
        df['movein_days'] = df['movein_days'].clip(lower=0)
        df['movein_date'] = df['movein_days']
    
    # 5. 건물 연식 계산
    if 'approve_date' in df.columns:
        df['approve_year'] = pd.to_datetime(df['approve_date'], errors='coerce').dt.year
        current_year = pd.Timestamp.now().year
        df['building_age'] = current_year - df['approve_year'].fillna(current_year - 20)
        df['building_age'] = df['building_age'].astype(int)
    
    # 6. 층수 처리
    if 'floor' in df.columns and 'all_floors' in df.columns:
        df["is_semi_basement"] = df["floor"].astype(str).str.contains("반지하", na = False)
        df["is_rooftop"] = df["floor"].astype(str).str.contains("옥탑방", na = False)
        df['is_first_floor'] = (df['floor'].astype(str).str.strip() == '1').astype(int)
        
        df["all_floors"] = pd.to_numeric(df["all_floors"], errors = "coerce").fillna(1).astype(int)
        
        f_str = df["floor"].astype(str)
        df.loc[f_str.str.contains('옥탑방', na=False), 'floor'] = df['all_floors'].astype(str)
        df.loc[f_str.str.contains('반지하', na=False), 'floor'] = "-1"
        
        df['floor'] = pd.to_numeric(df['floor'], errors='coerce').fillna(1).astype(int)
        df["relative_floor"] = df["floor"] / df["all_floors"]

    # 7. 계약 종류 판단
    if 'deposit' in df.columns and 'rent' in df.columns:
        conditions = [
            (df['rent'] == 0),
            (df['deposit'] / (df['rent'] + 1e-9) >= 100),
            (df['deposit'] / (df['rent'] + 1e-9) < 100)
        ]
        choices = ['전세', '반전세', '월세']
        df['contract_class'] = np.select(conditions, choices, default='기타')

    return df

def calculate_actual_converted_rent(df):
    """
    실제 보증금과 월세를 지역별 환산율을 적용하여 환산 월세로 변환함.
    data_processor.py의 로직과 동일함.
    """
    district_conversion_rate = {
        "종로구": 6.2, "중구": 5.8, "용산구": 5.3, "성동구": 5.5, "광진구": 5.3,
        "동대문구": 5.9, "중랑구": 5.5, "성북구": 5.9, "강북구": 5.8, "도봉구": 5.9,
        "노원구": 6.7, "은평구": 5.7, "서대문구": 6.5, "마포구": 5.8, "양천구": 5.6,
        "강서구": 6.0, "구로구": 5.9, "금천구": 5.7, "영등포구": 5.8, "동작구": 5.9,
        "관악구": 5.6, "서초구": 5.0, "강남구": 5.4, "송파구": 5.1, "강동구": 5.1,
        "기타": 5.5,
    }
    
    df = df.copy()
    # district가 없으면 전처리 먼저 수행
    if 'district' not in df.columns:
        df = preprocess_for_inference(df, drop_invalid=False)
        
    df['conversion_rate'] = df['district'].map(district_conversion_rate).fillna(5.5)
    df['actual_converted_rent'] = (df['deposit'] * df['conversion_rate'] / 1200) + df['rent']
    
    return df['actual_converted_rent']

def align_features(df, required_features):
    if df.empty:
        return pd.DataFrame(columns=required_features)
        
    df = df.copy()
    cat_cols = ["room_type", "room_direction", "district", "contract_class"]
    needs_dummy = any("_" in f for f in required_features if not f.startswith("is_"))
    
    if needs_dummy:
        df = pd.get_dummies(df, columns=[c for c in cat_cols if c in df.columns])
    
    for col in required_features:
        if col not in df.columns:
            df[col] = 0
            
    return df[required_features]
