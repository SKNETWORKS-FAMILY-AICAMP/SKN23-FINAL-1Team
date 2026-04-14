import os
import requests
from io import BytesIO
from PIL import Image
from openai import OpenAI
from dotenv import load_dotenv
from datetime import datetime
import base64
import json

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
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREATE_IMAGE_DIR = os.path.join(BACKEND_DIR, "create_image")

def _refine_prompt(user_prompt: str, model: str, system_role: str):
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
        return refined_prompt
    except Exception as e:
        print(f"[_refine_prompt] Error: {e}")
        return user_prompt

def generate_image(user_prompt: str, size: str = "1024x1024", quality: str = "standard", n: int = 1):
    system_role = (
        "너는 10년 차 부동산 인테리어 전문가이자 베테랑 사진작가야. "
        "사용자의 한국어 요청을 바탕으로, DALL-E 3가 아주 사실적이고 매력적인 "
        "부동산 매물 사진을 그릴 수 있도록 상세한 영문 프롬프트를 작성해줘."
    )
    refined_prompt = _refine_prompt(user_prompt, GEN_GPT_MODEL, system_role)
    try:
        response = client.images.generate(model=GEN_DALLE_MODEL, prompt=refined_prompt, size=size, quality=quality, n=n)
        image_url = response.data[0].url
        image_data = requests.get(image_url).content
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_prompt = user_prompt[:20].replace(" ", "_")
        file_name = f"{safe_prompt}_{timestamp}.png"
        file_path = os.path.join(CREATE_IMAGE_DIR, file_name)
        with open(file_path, "wb") as f:
            f.write(image_data)
        return [file_path]
    except Exception as e:
        print(f"[generate_image] Error: {e}")
        return None

def _encode_image(image_path: str):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def evaluate_image_quality(user_prompt: str, image_path: str):
    try:
        print(f"[evaluate_image_quality] Judging image: {os.path.basename(image_path)}")
        base64_image = _encode_image(image_path)
        judge_model = os.getenv("IMAGE_JUDGE_GPT_MODEL", "gpt-4o") 
        response = client.chat.completions.create(
            model=judge_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "너는 이미지-텍스트 정렬도(Image-Text Alignment) 전문 검수관이야. "
                        "너의 임무는 제공된 '프롬프트'의 핵심 키워드들이 '이미지'에 얼마나 정확하게 반영되었는지 정량적으로 평가하는 것이야.\n\n"
                        "평가 기준:\n"
                        "1. 키워드 일치성: 프롬프트에 명시된 가구, 색상, 재질, 스타일이 모두 포함되었는가?\n"
                        "2. 공간적 배치: 가구의 위치나 방의 구조가 프롬프트 설명과 논리적으로 일치하는가?\n"
                        "3. 분위기 재현: 프롬프트가 의도한 특유의 무드(아늑함, 모던함 등)가 잘 느껴지는가?\n\n"
                        "결과는 반드시 다음 JSON 형식으로만 출력해:\n"
                        "{\"score\": (1-10 사이의 정수), \"reason\": \"반영된 요소와 누락된 요소를 구체적으로 대조하여 설명\"}"
                    )
                },
                {"role": "user", "content": [{"type": "text", "text": f"대조할 프롬프트: {user_prompt}"}, {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}]}
            ],
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)
        result["model"] = judge_model
        return result
    except Exception as e:
        return {"score": 0, "reason": f"평가 실패: {e}", "model": "unknown"}
