import os
import requests
from io import BytesIO
from PIL import Image
from openai import OpenAI
from dotenv import load_dotenv
from datetime import datetime

# 프로젝트 루트의 .env 파일 로드 (현재 파일 위치 기준 상위-상위 폴더)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
dotenv_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path)

# OpenAI 클라이언트 초기화
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 모델 설정 (환경 변수에서 읽어옴, 기본값 설정 포함)
GEN_GPT_MODEL = os.getenv("IMAGE_GEN_GPT_MODEL", "gpt-4o")
GEN_DALLE_MODEL = os.getenv("IMAGE_GEN_DALLE_MODEL", "dall-e-3")

# --- 신규 추가: 이미지 저장 경로 설정 ---
# backend/create_image 폴더 경로 지정
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # backend 폴더
CREATE_IMAGE_DIR = os.path.join(BACKEND_DIR, "create_image") # backend/create_image

def _refine_prompt(user_prompt: str, model: str, system_role: str):
    """
    GPT를 경유하여 사용자의 요청을 DALL-E용 고퀄리티 영문 프롬프트로 변환합니다.
    """
    try:
        print(f"[_refine_prompt] Refining prompt with {model}...")
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_role},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7
        )
        refined_prompt = response.choices[0].message.content
        print(f"[_refine_prompt] Refined: {refined_prompt[:50]}...")
        return refined_prompt
    except Exception as e:
        print(f"[_refine_prompt] Error: {e}")
        return user_prompt  # 실패 시 원본 프롬프트 사용

def generate_image(user_prompt: str, size: str = "1792x1024", quality: str = "standard", n: int = 1):
    """
    GPT를 경유하여 텍스트 프롬프트를 고도화한 뒤 이미지를 생성합니다 (DALL-E 3).
    생성된 이미지를 backend/create_image 폴더에 저장하고 저장된 파일 경로를 반환합니다.
    """
    system_role = (
        "너는 10년 차 부동산 인테리어 전문가이자 베테랑 사진작가야. "
        "사용자의 한국어 요청을 바탕으로, DALL-E 3가 아주 사실적이고 매력적인 "
        "부동산 매물 사진을 그릴 수 있도록 상세한 영문 프롬프트를 작성해줘. "
        "조명, 가구 스타일, 벽면 재질, 구도 등을 전문적으로 묘사해야 해."
    )
    
    # 1. GPT로 프롬프트 고도화
    refined_prompt = _refine_prompt(user_prompt, GEN_GPT_MODEL, system_role)
    
    # 2. DALL-E 3 이미지 생성
    try:
        print(f"[generate_image] Using model: {GEN_DALLE_MODEL}")
        response = client.images.generate(
            model=GEN_DALLE_MODEL,
            prompt=refined_prompt,
            size=size,
            quality=quality,
            n=n,
        )
        
        # --- 신규 추가: 이미지 다운로드 및 로컬 저장 ---
        image_url = response.data[0].url
        image_data = requests.get(image_url).content
        
        # 유니크한 파일명 생성 (예: style1_20231027_143005.png)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_prompt = user_prompt.replace(" ", "_").replace(",", "") # 한글 프롬프트 일부 활용
        file_name = f"{safe_prompt}_{timestamp}.png"
        file_path = os.path.join(CREATE_IMAGE_DIR, file_name)
        
        # 이미지 저장
        with open(file_path, "wb") as f:
            f.write(image_data)
            
        print(f"[generate_image] Saved: {file_name}")
        
        # 저장된 로컬 파일 경로 반환 (URL 대신)
        return [file_path]
        
    except Exception as e:
        print(f"[generate_image] Error: {e}")
        return None

# 나머지 함수들(vary, edit)은 그대로 둡니다.