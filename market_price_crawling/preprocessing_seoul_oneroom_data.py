import pandas as pd
import numpy as np

data = pd.read_csv("data/seoul_oneroom_data.csv")

numeric_columns = ["buildYear", "dealMonth", "dealYear", "deposit", "excluUseAr", "floor", "monthlyRent"]

for numeric_column in numeric_columns:
    data[numeric_column] = pd.to_numeric(data[numeric_column], errors = "coerce")
    data = data.dropna(subset = [numeric_column])

data = data.dropna(subset = ["umdNm"])

conditions = [
    (data['monthlyRent'] == 0),                                  # 전세
    (data['deposit'] / data['monthlyRent'] >= 100),                  # 반전세
    (data['deposit'] / data['monthlyRent'] < 100)                    # 월세
]

choices = ['전세', '반전세', '월세']

data['class'] = np.select(conditions, choices, default='기타')

data.to_csv("data/seoul_oneroom_data_adjusted.csv", index = False)