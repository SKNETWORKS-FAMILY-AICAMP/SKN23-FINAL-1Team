import os
import requests
from openai import OpenAI
from dotenv import load_dotenv
from datetime import datetime
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor

# 프로젝트 루트의 .env 파일 로드
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
    try:
        print(f"[_refine_prompt] Refining prompt with {model}...")
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_role},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7
        )
        res_content = json.loads(response.choices[0].message.content)
        refined_prompt = res_content.get("prompt", user_prompt)
        file_summary = res_content.get("summary", "room_image")
        print(f"[_refine_prompt] Summary: {file_summary}")
        return refined_prompt, file_summary

    except Exception as e:
        print(f"[_refine_prompt] Error: {e}")
        return user_prompt, "error_image"


def _generate_single(user_prompt: str, system_role: str, size: str, quality: str, index: int):
    """이미지 1장 생성 (병렬 호출용)"""
    try:
        refined_prompt, file_summary = _refine_prompt(user_prompt, GEN_GPT_MODEL, system_role)

        print(f"[generate_image] Generating image {index+1}/4 for: {file_summary}")
        response = client.images.generate(
            model=GEN_DALLE_MODEL,
            prompt=refined_prompt,
            size=size,
            quality=quality,
            n=1,
        )

        image_url = response.data[0].url
        image_data = requests.get(image_url).content

        timestamp = datetime.now().strftime("%H%M%S")
        random_suffix = os.urandom(2).hex()
        file_name = f"{timestamp}_{file_summary}_{random_suffix}.png"
        file_path = os.path.join(CREATE_IMAGE_DIR, file_name)

        with open(file_path, "wb") as f:
            f.write(image_data)

        print(f"[generate_image] Saved: {file_name}")
        return file_path

    except Exception as e:
        print(f"[generate_image] Error on image {index+1}: {e}")
        return None


def generate_image(user_prompt: str, size: str = "1792x1024", quality: str = "standard", n: int = 4):
    system_role = (
        """
            You are a Korean real estate photographer.

            Create a DALL-E 3 prompt for a realistic Korean studio apartment (one-room).
            Return a JSON object with two keys:
            - "prompt": the detailed DALL-E 3 prompt in English
            - "summary": a short English filename summary (snake_case, max 30 chars)

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

    # 4장 병렬 생성
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [
            executor.submit(_generate_single, user_prompt, system_role, size, quality, i)
            for i in range(4)
        ]
        file_paths = [f.result() for f in futures]

    file_paths = [p for p in file_paths if p is not None]

    return file_paths if file_paths else None