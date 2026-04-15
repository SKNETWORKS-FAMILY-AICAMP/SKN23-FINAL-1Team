import pandas as pd
import os

def get_last_csv():
    file_list = os.listdir("raw_data")
    file_list = sorted(file_list)

    return file_list[-1]

def get_csv(filename: str):
    df = pd.read_csv(f"raw_data/{filename}")

    return df

def drop_fake_items(df):
    print(f"{df["title"].isna().sum()} 개의 가짜 매물 발견.")
    df = df.dropna(subset = ["title"])
    print("가짜 매물 처리 완료")

    return df

def drop_three_room(df):
    df = df[df["room_type"] != "쓰리룸"]
    
    return df

def floor_processing(df):
    df["is_semi_basement"] = df["floor"].str.contains("반지하", na = False)
    df["is_rooftop"] = df["floor"].str.contains("옥탑방", na = False)
    df['is_first_floor'] = (df['floor'].astype(str).str.strip().isin(['1'])).astype(int)
    df["floor"] = df["floor"].astype(str).str.strip()
    df["all_floors"] = pd.to_numeric(df["all_floors"], errors = "coerce").fillna(1).astype(int)
    df.loc[df['floor'].str.contains('옥탑방', na=False), 'floor'] = df['all_floors']
    df.loc[df['floor'].str.contains('반지하', na=False), 'floor'] = -1
    df.loc[df['floor'].str.contains('저', na=False), 'floor'] = (df['all_floors'] * 0.2).round()
    df.loc[df['floor'].str.contains('중', na=False), 'floor'] = (df['all_floors'] * 0.5).round()
    df.loc[df['floor'].str.contains('고', na=False), 'floor'] = (df['all_floors'] * 0.8).round()
    df['floor'] = pd.to_numeric(df['floor'], errors='coerce').astype(int)
    df.loc[df['floor'] == 0, 'floor'] = 1
    df["relative_floor"] = df["floor"] / df["all_floors"]

    return df

def onehot_encoding(df):
    

if __name__ == "__main__":
    pass