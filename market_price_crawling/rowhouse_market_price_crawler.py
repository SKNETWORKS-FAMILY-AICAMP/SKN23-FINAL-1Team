import requests
from dotenv import load_dotenv
import os
from datetime import datetime
from district import district
import time
import csv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(ROOT_DIR, ".env"))
DATA_GO_KR_API_KEY = os.getenv("DATA_GO_KR_API_KEY")

def get_real_estate_data(lawd_cd, deal_ymd, DATA_GO_KR_API_KEY, num_rows, page):
    
    DATA_GO_KR_API_KEY = DATA_GO_KR_API_KEY
    
    url = f"https://apis.data.go.kr/1613000/RTMSDataSvcRHRent/getRTMSDataSvcRHRent?LAWD_CD={lawd_cd}&DEAL_YMD={deal_ymd}&serviceKey={DATA_GO_KR_API_KEY}&numOfRows={num_rows}&_type=json&pageNo={page}"
    try:
        response = requests.get(url, timeout = 10)

        if response.status_code == 200:
            return response.json()
        else:
            print("응답 거절")
            print(f"실패 코드: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"코드 작성 오류 : {e}")

    return None

def get_total_data(district_name, deal_ymd, DATA_GO_KR_API_KEY, num_rows):
    file_path = f"data/rowhouse_seoul_real_estate_data.csv"

    lawd_cd = district[district_name]
    page = 1
    rows = []
    while True:
        data = get_real_estate_data(lawd_cd, deal_ymd, DATA_GO_KR_API_KEY, num_rows, page)

        if not data:
            break
        
        for item in data["response"]["body"]["items"]["item"]:
            row = []
            for column in item_columns:
                if column == "deposit":
                    row.append(int(str(item.get(column, "")).replace(",", "")))
                else:
                    row.append(item.get(column, ""))
           
            if row[5] == -1:
                row.append(True)
            else:
                row.append(False)
            if row[6] != 0:
                row.append(True)
            else:
                row.append(False)
            
            rows.append(row)
        
        total_count = data["response"]["body"]["totalCount"]
        
        if page * int(num_rows) >= total_count:
            break

        page += 1
        time.sleep(1)
    file_exists = os.path.isfile(file_path)

    with open(file_path, "a", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(item_columns + ["semi_basement", "wolse"])
        writer.writerows(rows)
    
    print(f"{district_name} {deal_ymd} 데이터 수집 완료")

def make_deal_ymds(last_n_years):
    today = str(datetime.today())
    year = today.split("-")[0]
    month = today.split("-")[1]
    deal_ymds = []
    for _ in range(last_n_years * 12):
        month = str(int(month) - 1)
        if len(month) == 1:
            month = "0" + month
        if month == "00":
            year = str(int(year) - 1)
            month = "12"
        deal_ymds.append(year + month)
    return deal_ymds

item_columns = [
    "buildYear",
    "dealMonth",
    "dealYear",
    "deposit",
    "excluUseAr",
    "floor",
    "monthlyRent",
    "umdNm",
]

if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    deal_ymds = make_deal_ymds(1)
    for district_name in district.keys():
        for deal_ymd in deal_ymds:
            get_total_data(
                district_name = district_name, 
                deal_ymd = deal_ymd, 
                DATA_GO_KR_API_KEY = DATA_GO_KR_API_KEY, 
                num_rows = 500,
            )

