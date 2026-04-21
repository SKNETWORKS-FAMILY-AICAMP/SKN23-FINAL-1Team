import pandas as pd
import boto3
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
from PIL import Image
import io
import os
from dotenv import load_dotenv

load_dotenv()

# 방 데이터 CSV 경로
CSV_PATH = '/home/heartsping/SKN23-FINAL-1team/ml_research/data/_select_s3_url_room_score_from_item_images_ii_inner_join_item_im_202604211109.csv'
BUCKET_NAME = 'skn23-final-1team-355904321127-ap-northeast-2-an'

s3 = boto3.client('s3', 
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name='ap-northeast-2'
)

def download_image(s3_url):
    key = s3_url.replace(f"s3://{BUCKET_NAME}/", "")
    response = s3.get_object(Bucket=BUCKET_NAME, Key=key)
    return Image.open(io.BytesIO(response['Body'].read()))

def show_samples(df, min_score, max_score, title, filename):
    print(f"[{title}] 샘플 추출 중 ({min_score} ~ {max_score})...")
    subset = df[(df['room_score'] >= min_score) & (df['room_score'] < max_score)]
    
    if subset.empty:
        print(f"❌ [{title}] 조건에 맞는 데이터가 없습니다.")
        return
    
    n_samples = min(20, len(subset))
    samples = subset.sample(n=n_samples)
    
    cols = 5
    rows = (n_samples + cols - 1) // cols
    
    plt.figure(figsize=(20, 4 * rows))
    for i, (idx, row) in enumerate(samples.iterrows()):
        try:
            img = download_image(row['s3_url'])
            plt.subplot(rows, cols, i+1)
            plt.imshow(img)
            plt.title(f"Score: {row['room_score']:.4f}", fontsize=10)
            plt.axis('off')
        except Exception as e:
            print(f"⚠️ 이미지 로드 실패: {e}")
            
    plt.suptitle(title, fontsize=20, y=1.02)
    plt.tight_layout()
    plt.savefig(filename, bbox_inches='tight')
    print(f"✅ {filename} 저장 완료!")

def analyze_stats(df):
    scores = df['room_score']
    print("\n📊 [방 점수 기초 통계]")
    print(scores.describe())
    print("-" * 30)
    
    thresholds = [0.18, 0.20, 0.22, 0.225, 0.24, 0.25, 0.26, 0.28, 0.30]
    total = len(df)
    for t in thresholds:
        count = len(df[df['room_score'] >= t])
        print(f"임계값 {t:.2f} 이상: {count:7}개 ({(count/total)*100:5.1f}%)")
    
    plt.figure(figsize=(10, 6))
    plt.hist(scores, bins=100, color='skyblue', alpha=0.7, edgecolor='black')
    plt.title('Room Score Distribution', fontsize=15)
    plt.xlabel('Score')
    plt.ylabel('Frequency')
    plt.grid(axis='y', alpha=0.3)
    plt.savefig('room_distribution.png')
    print("\n✅ 분포 히스토그램 저장 완료 (room_distribution.png)")

if __name__ == "__main__":
    if not os.path.exists(CSV_PATH):
        print(f"❌ CSV 파일을 찾을 수 없습니다: {CSV_PATH}")
    else:
        print("🚀 방 데이터 통합 분석을 시작합니다...")
        df = pd.read_csv(CSV_PATH)
        analyze_stats(df)
        
        # 1. 고득점
        #show_samples(df, 0.28, 1.0, "High Score Room Samples", "room_high_20.png")
        # 2. 임계값 후보군
        show_samples(df, 0.225, 0.23, "Threshold Area Room Samples", "room_mid_20.png")
        # 3. 저득점
        #show_samples(df, 0.0, 0.18, "Low Score (Not Room) Samples", "room_low_20.png")
        
        print("\n🎉 모든 분석이 완료되었습니다! 생성된 이미지들을 확인하세요.")
