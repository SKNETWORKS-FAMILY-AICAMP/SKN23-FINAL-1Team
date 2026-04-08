import os
from openai import OpenAI
from dotenv import load_dotenv

# 프로젝트 루트의 .env 파일 로드 (현재 파일 위치 기준 상위-상위 폴더)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
dotenv_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path)

# OpenAI 클라이언트 초기화
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 모델 설정 (환경 변수에서 읽어옴, 기본값 설정 포함)
GEN_GPT_MODEL = os.getenv("IMAGE_GEN_GPT_MODEL", "gpt-4o")
GEN_DALLE_MODEL = os.getenv("IMAGE_GEN_DALLE_MODEL", "dall-e-3")

EDIT_GPT_MODEL = os.getenv("IMAGE_EDIT_GPT_MODEL", "gpt-4o")
EDIT_DALLE_MODEL = os.getenv("IMAGE_EDIT_DALLE_MODEL", "dall-e-2")

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
        return [data.url for data in response.data]
    except Exception as e:
        print(f"[generate_image] Error: {e}")
        return None

def modify_image_variation(image_path: str, n: int = 1, size: str = "1024x1024"):
    """
    기존 이미지를 기반으로 변형 이미지를 생성합니다 (DALL-E 2).
    주로 전체적인 분위기를 유지하며 바꿀 때 사용합니다.
    """
    try:
        print(f"[modify_image_variation] Using model: {EDIT_DALLE_MODEL}")
        with open(image_path, "rb") as image_file:
            response = client.images.create_variation(
                model=EDIT_DALLE_MODEL,
                image=image_file,
                n=n,
                size=size,
            )
        return [data.url for data in response.data]
    except Exception as e:
        print(f"[modify_image_variation] Error: {e}")
        return None

def edit_image_inpainting(image_path: str, mask_path: str, user_prompt: str, n: int = 1, size: str = "1024x1024"):
    """
    GPT를 경유하여 요청을 다듬은 뒤, 이미지의 특정 부분(마스크 영역)을 수정합니다 (DALL-E 2).
    """
    system_role = (
        "너는 인테리어 수정 전문가야. 사용자가 이미지의 특정 부분을 어떻게 고치고 싶어 하는지 "
        "DALL-E 2가 정확히 이해할 수 있도록 간결하고 명확한 영문 수정 지시문으로 변환해줘."
    )
    
    # 1. GPT로 수정 지시문 고도화
    refined_prompt = _refine_prompt(user_prompt, EDIT_GPT_MODEL, system_role)
    
    # 2. DALL-E 2 인페인팅 실행
    try:
        print(f"[edit_image_inpainting] Using model: {EDIT_DALLE_MODEL}")
        with open(image_path, "rb") as image_file, open(mask_path, "rb") as mask_file:
            response = client.images.edit(
                model=EDIT_DALLE_MODEL,
                image=image_file,
                mask=mask_file,
                prompt=refined_prompt,
                n=n,
                size=size,
            )
        return [data.url for data in response.data]
    except Exception as e:
        print(f"[edit_image_inpainting] Error: {e}")
        return None
