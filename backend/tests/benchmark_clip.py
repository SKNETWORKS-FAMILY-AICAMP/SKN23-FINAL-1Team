import torch
import open_clip
from PIL import Image
import time
import numpy as np
import os

# 1. 모델 설정 (기존에 쓰던 ViT-B-32)
MODEL_TYPE = 'ViT-B-32'

# 모델 파일 경로 확인해라! 없으면 에러 날 테니까.
CHECKPOINT_PATH = '../ml_research/model/ViT-B-32.pt'

def benchmark_clip():
    print(f"[*] 아키텍처 확인: {os.uname().machine}")
    print(f"[*] 모델 로드 중... ({MODEL_TYPE})")

    start_load = time.time()
    model, _, preprocess = open_clip.create_model_and_transforms(
        MODEL_TYPE,
        pretrained=CHECKPOINT_PATH if os.path.exists(CHECKPOINT_PATH) else 'laion2b_s34b_b79k'
    )
    model.eval()
    end_load = time.time()
    print(f"[*] 모델 로드 소요 시간: {end_load - start_load:.4f}초")

    # 테스트용 더미 이미지 생성 (가로세로 224, CLIP 기본 사이즈)
    dummy_image = Image.fromarray(np.uint8(np.random.randint(0, 255, (224, 224, 3))))

    print("\n[*] 벤치마크 시작 (총 10회 수행)...")
    latencies = []

    with torch.no_grad():
        for i in range(10):
            start_time = time.time()
            # 1. 전처리
            image_input = preprocess(dummy_image).unsqueeze(0)
            # 2. 임베딩 추출
            image_features = model.encode_image(image_input)
            # 3. 정규화
            image_features /= image_features.norm(dim=-1, keepdim=True)
            end_time = time.time()
            latency = end_time - start_time
            latencies.append(latency)
            print(f"  - {i+1}회차: {latency:.4f}초")

    avg_latency = np.mean(latencies[1:]) # 첫 번째는 Cold Start니까 제외하고 평균
    print(f"\n[결과] 평균 소요 시간 (Cold Start 제외): {avg_latency:.4f}초")

    if avg_latency < 0.5:
        print("결론: 올~ 겁나 빠른데? 그냥 동기로 처리해도 되겠어.")
    elif avg_latency < 1.5:
        print("결론: 약간 묵직하긴 한데, 로딩 바 하나 띄워주면 사용자도 참을 수 있는 수준이야.")
    else:
        print("결론: 야, 이거 너무 느려. 다시 비동기로 짜는 거 고민해봐.")

if __name__ == "__main__":
    benchmark_clip()