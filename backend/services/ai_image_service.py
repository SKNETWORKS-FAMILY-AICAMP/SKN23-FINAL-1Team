import os
import requests
import json
from openai import OpenAI
from dotenv import load_dotenv
from datetime import datetime

# (기존 경로 설정 및 초기화 부분 동일)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
dotenv_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
GEN_GPT_MODEL = os.getenv("IMAGE_GEN_GPT_MODEL", "gpt-4o")
GEN_DALLE_MODEL = os.getenv("IMAGE_GEN_DALLE_MODEL", "dall-e-3")

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREATE_IMAGE_DIR = os.path.join(BACKEND_DIR, "create_image")

if not os.path.exists(CREATE_IMAGE_DIR):
    os.makedirs(CREATE_IMAGE_DIR, exist_ok=True)
    print(f"[*] 이미지 저장 폴더 생성 완료: {CREATE_IMAGE_DIR}")

def _refine_prompt(user_prompt: str, model: str, system_role: str):
    """
    GPT를 경유하여 상세 영문 프롬프트와 파일명용 영문 요약을 JSON으로 반환합니다.
    """
    try:
        print(f"[_refine_prompt] Refining prompt with {model}...")
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_role},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}, # JSON 응답 강제
            temperature=0.7
        )
        
        # GPT가 뱉은 JSON 파싱
        res_content = json.loads(response.choices[0].message.content)
        refined_prompt = res_content.get("prompt", user_prompt)
        file_summary = res_content.get("summary", "room_image")
        
        print(f"[_refine_prompt] Summary: {file_summary}")
        return refined_prompt, file_summary
    
    except Exception as e:
        print(f"[_refine_prompt] Error: {e}")
        # 에러 시 기본값 반환
        return user_prompt, "error_image"

def generate_image(user_prompt: str, size: str = "1792x1024", quality: str = "standard", n: int = 1):
    # 시스템 롤 업데이트 (JSON 출력 지침 추가)
    system_role = (
        """
            You are a Korean real estate photographer.

            Create a DALL-E 3 prompt for a realistic Korean studio apartment (one-room).

            ## CORE OBJECTIVE ##
            - Each generation must represent a DIFFERENT apartment variation based on the same user condition.
            - The result should look like a real Korean real estate listing.
            - Avoid perfect showroom style; include slight imperfections.

            ## VARIATION RULE ##
            - Slightly vary layout, lighting, and appliance arrangement for each generation
            - Ensure each output feels like a distinct apartment, not a duplicate

            ## REALISM ##
            - narrow or awkward rectangular layout
            - large window but view partially blocked by nearby building
            - wall-mounted air conditioner placed awkwardly
            - compact kitchen with tight spacing (sink, induction, washing machine, fridge)
            - small awkward empty space
            - built-in closet taking wall space
            - bright but slightly harsh ceiling lighting

            ## VISUAL RULES ##
            - flooring: light oak or soft grey wood (no yellow)
            - walls: clean white wallpaper
            - white IKEA-style furniture
            - digital door lock

            ## STYLE ##
            - real estate listing photo
            - slight wide-angle lens
            - clean but not luxurious
        """
    )
    
    # 1. GPT로 프롬프트 고도화 및 요약 획득
    refined_prompt, file_summary = _refine_prompt(user_prompt, GEN_GPT_MODEL, system_role)
    
    # 2. DALL-E 3 이미지 생성
    try:
        print(f"[generate_image] Generating image for: {file_summary}")
        response = client.images.generate(
            model=GEN_DALLE_MODEL,
            prompt=refined_prompt,
            size=size,
            quality=quality,
            n=n,
        )
        
        image_url = response.data[0].url
        image_data = requests.get(image_url).content
        
        # 3. 파일명 조립 (시분초_요약_랜덤값.png)
        timestamp = datetime.now().strftime("%H%M%S")
        random_suffix = os.urandom(2).hex() 
        
        # 예: 153045_clean_semi_basement_ab12.png
        file_name = f"{timestamp}_{file_summary}_{random_suffix}.png"
        file_path = os.path.join(CREATE_IMAGE_DIR, file_name)
        
        with open(file_path, "wb") as f:
            f.write(image_data)
            
        print(f"[generate_image] Saved: {file_name}")
        return [file_path]
        
    except Exception as e:
        print(f"[generate_image] Error: {e}")
        return None