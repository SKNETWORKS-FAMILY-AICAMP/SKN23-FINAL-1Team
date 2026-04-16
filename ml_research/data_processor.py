import pandas as pd
import numpy as np
import os

def get_last_csv():
    file_list = os.listdir("raw_data")
    file_list = sorted(file_list)
    return file_list[-1]

def get_csv(filename: str):
    df = pd.read_csv(f"raw_data/{filename}")
    return df

def drop_fake_items(df):
    df = df.dropna(subset = ["address"])
    return df

def drop_three_room(df):
    df = df[df["room_type"] != "쓰리룸"]
    return df

def find_gu(df):
    df["district"] = df["address"].str.split().str[0]
    df.loc[df["district"].str.contains("서울시"), "district"] = df["address"].str.split().str[1]
    seoul_gu_set = {
    '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구',
    '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구',
    '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'
    }
    df.loc[~df["district"].isin(seoul_gu_set), "district"] = "기타"
    del df["address"]
    return df

def bathroom_count_jungsanghwa(df):
    df.loc[df['bathroom_count'] == 0, 'bathroom_count'] = 1
    df.loc[df['bathroom_count'] > 2, 'bathroom_count'] = 2
    return df

def define_class(df):
    conditions = [
    (df['rent'] == 0),                                 
    (df['deposit'] / df['rent'] >= 100),                  
    (df['deposit'] / df['rent'] < 100)                   
    ]
    choices = ['전세', '반전세', '월세']
    df['contract_class'] = np.select(conditions, choices, default='기타')

    return df

def converting_monthly_rent(df):
    district_conversion_rate = {
    "종로구": 6.2,
    "중구": 5.8,
    "용산구": 5.3,
    "성동구": 5.5,
    "광진구": 5.3,
    "동대문구": 5.9,
    "중랑구": 5.5,
    "성북구": 5.9,
    "강북구": 5.8,
    "도봉구": 5.9,
    "노원구": 6.7,
    "은평구": 5.7,
    "서대문구": 6.5,
    "마포구": 5.8,
    "양천구": 5.6,
    "강서구": 6.0,
    "구로구": 5.9,
    "금천구": 5.7,
    "영등포구": 5.8,
    "동작구": 5.9,
    "관악구": 5.6,
    "서초구": 5.0,
    "강남구": 5.4,
    "송파구": 5.1,
    "강동구": 5.1,
    "기타": 5.5,
    }
    df['conversion_rate'] = df['district'].map(district_conversion_rate)
    df['converted_monthly_rent'] = (df['deposit'] * df['conversion_rate'] / 12) + df['rent']
    del df["conversion_rate"]
    del df["deposit"]
    del df["rent"]
    return df

def floor_processing(df):
    df["is_semi_basement"] = df["floor"].str.contains("반지하", na = False)
    df["is_rooftop"] = df["floor"].str.contains("옥탑방", na = False)
    df['is_first_floor'] = (df['floor'].astype(str).str.strip().isin(['1'])).astype(int)
    df["floor"] = df["floor"].astype(str).str.strip()
    df["all_floors"] = pd.to_numeric(df["all_floors"], errors = "coerce").fillna(1).astype(int)
    df.loc[df['floor'].str.contains('옥탑방', na=False), 'floor'] = df['all_floors'].astype(str)
    df.loc[df['floor'].str.contains('반지하', na=False), 'floor'] = "-1"
    df.loc[df['floor'].str.contains('저', na=False), 'floor'] = (df['all_floors'] * 0.2).round().astype(int).astype(str)
    df.loc[df['floor'].str.contains('중', na=False), 'floor'] = (df['all_floors'] * 0.5).round().astype(int).astype(str)
    df.loc[df['floor'].str.contains('고', na=False), 'floor'] = (df['all_floors'] * 0.8).round().astype(int).astype(str)
    df['floor'] = pd.to_numeric(df['floor'], errors='coerce').astype(int)

    df.loc[df['floor'] == 0, 'floor'] = 1
    df["relative_floor"] = df["floor"] / df["all_floors"]
    return df

def onehot_encoding(df):
    cols = ["room_type", "room_direction", "district", "contract_class"]
    df = pd.get_dummies(df, columns = cols, drop_first = True)
    return df

if __name__ == "__main__":
    filename = get_last_csv()
    print(filename)
    df = get_csv(filename)
    processed_df = (
        df.pipe(drop_fake_items)
        .pipe(drop_three_room)
        .pipe(find_gu)
        .pipe(bathroom_count_jungsanghwa)
        .pipe(define_class)
        .pipe(converting_monthly_rent)
        .pipe(floor_processing)
        .pipe(onehot_encoding)
    )
    processed_df_officetel = processed_df[processed_df["service_type"] == "오피스텔"].drop(columns = ["service_type"])
    processed_df_oneroom = processed_df[processed_df["service_type"] == "원룸"].drop(columns = ["service_type"])
    processed_df_officetel.to_csv(f"processed_data/officetel_processed_{filename}", index = False, encoding = "utf-8-sig")
    processed_df_oneroom.to_csv(f"processed_data/oneroom_processed_{filename}", index = False, encoding = "utf-8-sig")
