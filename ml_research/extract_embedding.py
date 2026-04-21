import torch
import open_clip
import os

# 1. 모델 설정
MODEL_TYPE = 'ViT-B-32'
CHECKPOINT_PATH = 'model/ViT-B-32.pt'

def main(text_list):
    print(f"모델 로드 중... ({CHECKPOINT_PATH})")
    
    if not os.path.exists(CHECKPOINT_PATH):
        print(f"Error: 모델 파일을 찾을 수 없어! 경로 확인해봐: {CHECKPOINT_PATH}")
        return

    try:
        # 2. 모델과 토크나이저 불러오기
        # pretrained 인자에 로컬 파일 경로를 넣으면 그 파일을 가중치로 사용해.
        model, _, preprocess = open_clip.create_model_and_transforms(MODEL_TYPE, pretrained=CHECKPOINT_PATH, weights_only=False)
        tokenizer = open_clip.get_tokenizer(MODEL_TYPE)
        
        # 모델을 평가 모드로 전환 (Dropout 같은 게 꺼지게 함)
        model.eval()
        
        print("모델 로드 완료! 이제 텍스트를 벡터로 바꾼다?")

        # 3. 임베딩할 텍스트 준비
        text_list = text_list
        
        # 4. 토큰화 (텍스트를 숫자로 변환)
        text_tokens = tokenizer(text_list)

        # 5. 임베딩 추출 (추론)
        with torch.no_grad(): # 기울기 계산 안 함 (메모리 아껴야지!)
            text_features = model.encode_text(text_tokens)
            
            # 정규화 (L2 Norm) - 벡터의 길이를 1로 맞춰서 나중에 비교하기 좋게 만듦
            text_features /= text_features.norm(dim=-1, keepdim=True)

        # 6. 결과 확인
        print("\n=== 추출 결과 ===")
        for i, text in enumerate(text_list):
            print(f"텍스트: {text}")
            print(f"벡터 모양 (Shape): {text_features[i].shape}")
            print(f"앞부분 5개 값: {text_features[i][:5].tolist()}")
            print("-" * 30)

            return text_features[i].tolist()
    except Exception as e:
        print(f"하... 에러 났잖아! : {e}")

if __name__ == "__main__":
    main()
