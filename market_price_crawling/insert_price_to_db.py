import os
import sys
import pandas as pd
import numpy as np
import re
from sklearn.linear_model import LinearRegression

# ml_research 경로를 sys.path에 추가하여 db_connection 모듈을 불러올 수 있게 함
base_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(base_dir)
ml_research_dir = os.path.join(root_dir, 'ml_research')
sys.path.append(ml_research_dir)

try:
    from db_connection import db_connection
except ImportError as e:
    print(f"모듈 임포트 에러: {e}")
    sys.exit(1)

def preprocess_data(file_path):
    df = pd.read_csv(file_path)
    df = df.sort_values(['dealYear', 'dealMonth'])
    df['dealDate'] = df['dealYear'].astype(str) + '-' + df['dealMonth'].astype(str).str.zfill(2)

    # 1. 적합성 분석
    dong_counts = df['umdNm'].value_counts()
    monthly_check = df.groupby(['umdNm', 'dealDate']).size().unstack(fill_value=0)
    total_months = df['dealDate'].nunique()
    zero_ratio = (monthly_check == 0).sum(axis=1) / total_months
    analysis_result = pd.DataFrame({'total_count': dong_counts, 'gap_ratio': zero_ratio})

    def judge_suitability(row):
        if row['total_count'] >= 300 and row['gap_ratio'] < 0.3: return "A"
        elif row['total_count'] >= 100: return "B"
        else: return "C"
    analysis_result['grade'] = analysis_result.apply(judge_suitability, axis=1)

    # 2. 구 매핑 및 동 그룹화
    seoul_gu_dong = {
        "종로구": ["청운동", "신교동", "궁정동", "효자동", "창성동", "통의동", "적선동", "통인동", "누상동", "누하동", "옥인동", "체부동", "필운동", "내자동", "사직동", "도렴동", "당주동", "내수동", "세종로", "신문로1가", "신문로2가", "청진동", "서린동", "수송동", "중학동", "종로1가", "공평동", "관훈동", "견지동", "와룡동", "권농동", "운니동", "익선동", "경운동", "관철동", "인사동", "낙원동", "종로2가", "팔판동", "삼청동", "안국동", "소격동", "화동", "사간동", "송현동", "가회동", "재동", "계동", "원서동", "훈정동", "묘동", "봉익동", "돈의동", "장사동", "관수동", "종로3가", "인의동", "예지동", "원남동", "연지동", "종로4가", "효제동", "종로5가", "종로6가", "이화동", "연건동", "충신동", "동숭동", "혜화동", "명륜1가", "명륜2가", "명륜4가", "명륜3가", "창신동", "숭인동", "교남동", "평동", "송월동", "홍파동", "교북동", "행촌동", "구기동", "평창동", "부암동", "홍지동", "신영동", "무악동"],
        "중구": ["무교동", "다동", "태평로1가", "을지로1가", "을지로2가", "남대문로1가", "삼각동", "수하동", "장교동", "수표동", "소공동", "남창동", "북창동", "봉래동1가", "봉래동2가", "회현동1가", "회현동2가", "회현동3가", "충무로1가", "충무로2가", "명동1가", "명동2가", "남산동1가", "남산동2가", "남산동3가", "저동1가", "충무로4가", "충무로5가", "인현동2가", "예관동", "묵정동", "필동1가", "필동2가", "필동3가", "남학동", "주자동", "예장동", "장충동1가", "장충동2가", "광희동1가", "광희동2가", "쌍림동", "을지로6가", "을지로7가", "을지로3가", "을지로4가", "을지로5가", "주교동", "방산동", "오장동", "입정동", "산림동", "초동", "신당동", "흥인동", "무학동", "황학동", "서소문동", "정동", "순화동", "의주로1가", "의주로2가", "중림동", "만리동1가", "만리동2가", "회현동", "명동", "필동", "장충동", "광희동", "을지로동", "다산동", "약수동", "청구동", "동화동", "저동2가", "충무로3가"],
        "용산구": ["후암동", "용산동2가", "용산동4가", "갈월동", "남영동", "용산동1가", "동자동", "서계동", "청파동1가", "청파동2가", "청파동3가", "원효로1가", "원효로2가", "신창동", "산천동", "청암동", "원효로3가", "원효로4가", "효창동", "도원동", "용문동", "문배동", "신계동", "한강로1가", "한강로2가", "용산동3가", "용산동5가", "한강로3가", "이촌동", "이태원동", "한남동", "동빙고동", "서빙고동", "주성동", "용산동6가", "보광동"],
        "성동구": ["상왕십리동", "하왕십리동", "마장동", "사근동", "행당동", "응봉동", "금호동1가", "금호동2가", "금호동3가", "금호동4가", "옥수동", "성수동1가", "성수동2가", "송정동", "용답동", "홍익동", "도선동"],
        "광진구": ["중곡동", "능동", "구의동", "광장동", "자양동", "화양동", "군자동"],
        "동대문구": ["신설동", "용두동", "제기동", "전농동", "답십리동", "장안동", "청량리동", "회기동", "휘경동", "이문동"],
        "중랑구": ["면목동", "상봉동", "중화동", "묵동", "망우동", "신내동"],
        "성북구": ["성북동", "성북동1가", "돈암동", "정릉동", "길음동", "종암동", "하월곡동", "상월곡동", "장위동", "석관동", "삼선동1가", "삼선동2가", "삼선동3가", "삼선동4가", "삼선동5가", "동소문동1가", "동소문동2가", "동소문동3가", "동소문동4가", "동소문동5가", "동소문동6가", "동소문동7가", "안암동1가", "안암동2가", "안암동3가", "안암동4가", "안암동5가", "보문동1가", "보문동2가", "보문동3가", "보문동4가", "보문동5가", "보문동6가", "보문동7가", "동선동1가", "동선동2가", "동선동3가", "동선동4가", "동선동5가"],
        "강북구": ["미아동", "번동", "수유동", "우이동"],
        "도봉구": ["쌍문동", "방학동", "창동", "도봉동"],
        "노원구": ["월계동", "공릉동", "하계동", "상계동", "중계동"],
        "은평구": ["수색동", "녹번동", "불광동", "갈현동", "구산동", "대조동", "응암동", "역촌동", "신사동", "증산동", "진관동"],
        "서대문구": ["충정로2가", "충정로3가", "합동", "미근동", "냉천동", "천연동", "옥천동", "영천동", "현저동", "북아현동", "홍제동", "대현동", "대신동", "신촌동", "봉원동", "창천동", "연희동", "홍은동", "북가좌동", "남가좌동", "충정로1가"],
        "마포구": ["아현동", "공덕동", "신공덕동", "도화동", "마포동", "대흥동", "염리동", "노고산동", "신수동", "현석동", "구수동", "창전동", "상수동", "하중동", "신정동", "당인동", "서교동", "동교동", "합정동", "망원동", "연남동", "성산동", "중동", "상암동", "서강동", "용강동", "토정동"],
        "양천구": ["신정동", "목동", "신월동"],
        "강서구": ["염창동", "등촌동", "화곡동", "가양동", "마곡동", "내발산동", "외발산동", "공항동", "방화동", "개화동", "과해동", "오곡동", "오쇠동"],
        "구로구": ["신도림동", "구로동", "가리봉동", "고척동", "개봉동", "오류동", "궁동", "온수동", "천왕동", "항동"],
        "금천구": ["가산동", "독산동", "시흥동"],
        "영등포구": ["영등포동", "영등포동1가", "영등포동2가", "영등포동3가", "영등포동4가", "영등포동5가", "영등포동6가", "영등포동7가", "영등포동8가", "여의도동", "당산동1가", "당산동2가", "당산동3가", "당산동4가", "당산동5가", "당산동6가", "당산동", "도림동", "문래동1가", "문래동2가", "문래동3가", "문래동4가", "문래동5가", "문래동6가", "양평동1가", "양평동2가", "양평동3가", "양평동4가", "양평동5가", "양평동6가", "양평동", "신길동", "대림동"],
        "동작구": ["노량진동", "상도동", "상도1동", "본동", "흑석동", "동작동", "사당동", "대방동", "신대방동"],
        "관악구": ["봉천동", "신림동", "남현동"],
        "서초구": ["방배동", "양재동", "우면동", "원지동", "잠원동", "반포동", "서초동", "내곡동", "염곡동", "신원동"],
        "강남구": ["역삼동", "개포동", "청담동", "삼성동", "대치동", "신사동", "논현동", "압구정동", "세곡동", "자곡동", "율현동", "일원동", "수서동", "도곡동"],
        "송파구": ["잠실동", "신천동", "풍납동", "송파동", "석촌동", "삼전동", "가락동", "문정동", "장지동", "방이동", "오금동", "거여동", "마천동"],
        "강동구": ["명일동", "고덕동", "상일동", "길동", "둔촌동", "암사동", "성내동", "천호동", "강일동"]
    }
    dong_to_gu = {dong: gu for gu, dongs in seoul_gu_dong.items() for dong in dongs}
    df['guNm'] = df['umdNm'].map(dong_to_gu)

    def simplify_dong(name):
        return re.sub(r'\d+[동가]|제?\d+동', '', name).strip()
    df['dongGroup'] = df['umdNm'].apply(simplify_dong)

    # 3. 환산보증금 계산 및 정규화 (핵심: 단위 면적당 가격 산출)
    district_conversion_rate = {"종로구": 6.2, "중구": 5.8, "용산구": 5.3, "성동구": 5.5, "광진구": 5.3, "동대문구": 5.9, "중랑구": 5.5, "성북구": 5.9, "강북구": 5.8, "도봉구": 5.9, "노원구": 6.7, "은평구": 5.7, "서대문구": 6.5, "마포구": 5.8, "양천구": 5.6, "강서구": 6.0, "구로구": 5.9, "금천구": 5.7, "영등포구": 5.8, "동작구": 5.9, "관악구": 5.6, "서초구": 5.0, "강남구": 5.4, "송파구": 5.1, "강동구": 5.1, "기타": 5.5}
    df['conversion_rate'] = df['guNm'].map(district_conversion_rate).fillna(5.5)
    df['converted_monthly_rent'] = (df['deposit'] * df['conversion_rate'] / 1200) + df['monthlyRent']
    
    # 면적 정규화: 1㎡당 월세 부담액 (평당 월세는 나중에 보여줄 때 3.3 곱하면 됨)
    df['rent_per_m2'] = df['converted_monthly_rent'] / df['excluUseAr']

    return df, analysis_result

def create_prediction_data(df, analysis_result):
    summary_data = []
    timeseries_data = []
    unique_dongs = df['umdNm'].dropna().unique()

    for dong in unique_dongs:
        if dong not in analysis_result.index: continue
        grade = analysis_result.loc[dong, 'grade']
        
        if grade == "A":
            target_df = df[df['umdNm'] == dong]
            analysis_scope = "동"
        elif grade == "B":
            group_name = df[df['umdNm'] == dong]['dongGroup'].iloc[0]
            target_df = df[df['dongGroup'] == group_name]
            analysis_scope = "인접동"
        else: # C
            gu_name = df[df['umdNm'] == dong]['guNm'].iloc[0]
            if pd.isna(gu_name): continue
            target_df = df[df['guNm'] == gu_name]
            analysis_scope = "구"

        # 정규화된 지표(rent_per_m2)로 시계열 집계
        plot_data = target_df.groupby('dealDate')['rent_per_m2'].mean().reset_index()
        if len(plot_data) < 2: continue

        first_val = plot_data['rent_per_m2'].iloc[0]
        last_val = plot_data['rent_per_m2'].iloc[-1]
        five_year_change_rate = ((last_val - first_val) / first_val) * 100

        # 예측 (단위 면적당 가격 기반)
        plot_data['index'] = range(len(plot_data))
        model = LinearRegression().fit(plot_data[['index']], plot_data['rent_per_m2'])
        
        X_next = pd.DataFrame([[len(plot_data)]], columns=['index'])
        prediction = model.predict(X_next)[0]
        change_rate = ((prediction - last_val) / last_val) * 100
        
        if change_rate >= 3: label = "폭등(위험)"
        elif change_rate >= 1: label = "상승(주의)"
        elif change_rate >= -1: label = "보합(안정)"
        elif change_rate >= -3: label = "하락"
        else: label = "급락"

        summary_data.append({
            "umdNm": dong,
            "guNm": df[df['umdNm'] == dong]['guNm'].iloc[0],
            "grade": grade,
            "analysis_scope": analysis_scope,
            "current_rent_per_m2": round(last_val, 4),
            "five_year_change_rate": round(five_year_change_rate, 2),
            "predicted_rent_per_m2": round(prediction, 4),
            "change_rate": round(change_rate, 2),
            "status_label": label
        })

        for _, row in plot_data.iterrows():
            timeseries_data.append({
                "umdNm": dong,
                "dealDate": row['dealDate'],
                "rent_per_m2": round(row['rent_per_m2'], 4)
            })

    return pd.DataFrame(summary_data), pd.DataFrame(timeseries_data)

if __name__ == "__main__":
    print("1. 데이터 전처리 및 정규화(㎡당 가격) 시작...")
    csv_path = os.path.join(base_dir, "data", "seoul_oneroom_data_adjusted.csv")
    df, analysis_result = preprocess_data(csv_path)

    print("2. 단위 면적당 시계열 예측 데이터 생성...")
    summary_df, timeseries_df = create_prediction_data(df, analysis_result)

    print("3. DB 적재 시작...")
    engine = db_connection()

    try:
        summary_df.to_sql('market_price_summary', engine, if_exists='replace', index=False)
        timeseries_df.to_sql('market_price_timeseries', engine, if_exists='replace', index=False)
        print(f"DB 적재 완료! 요약: {len(summary_df)}건, 시계열: {len(timeseries_df)}건")
        print("정규화 완료: 이제 매물 크기에 상관없는 정확한 시세 추적 가능!")
    except Exception as e:
        print(f"DB 에러: {e}")
    finally:
        engine.dispose()
