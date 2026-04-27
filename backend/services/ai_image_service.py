import json
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from urllib.parse import urlparse

import requests
from dotenv import load_dotenv
from openai import OpenAI

# 프로젝트 루트의 .env 파일 로드
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
dotenv_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
GEN_GPT_MODEL = os.getenv("IMAGE_GEN_GPT_MODEL", "gpt-4o")
GEN_DALLE_MODEL = os.getenv("IMAGE_GEN_DALLE_MODEL", "dall-e-3")
EDIT_IMAGE_MODEL = os.getenv("IMAGE_EDIT_MODEL", "gpt-image-1")

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
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        res_content = json.loads(response.choices[0].message.content)
        refined_prompt = res_content.get("prompt", user_prompt)
        file_summary = res_content.get("summary", "room_image")
        print(f"[_refine_prompt] Summary: {file_summary}")
        return refined_prompt, file_summary
    except Exception as exc:
        print(f"[_refine_prompt] Error: {exc}")
        return user_prompt, "error_image"


def _save_remote_image(image_url: str, file_summary: str, prefix: str = ""):
    image_data = requests.get(image_url, timeout=30).content

    timestamp = datetime.now().strftime("%H%M%S")
    random_suffix = os.urandom(2).hex()
    safe_prefix = f"{prefix}_" if prefix else ""
    file_name = f"{timestamp}_{safe_prefix}{file_summary}_{random_suffix}.png"
    file_path = os.path.join(CREATE_IMAGE_DIR, file_name)

    with open(file_path, "wb") as image_file:
        image_file.write(image_data)

    return file_path


def _build_generate_system_role():
    return """
        You are a Korean real estate photographer.

        Create a DALL-E 3 prompt for a realistic Korean studio apartment (one-room).
        Return a JSON object with two keys:
        - "prompt": the detailed DALL-E prompt in English
        - "summary": a short English filename summary (snake_case, max 30 chars)

        ## CORE OBJECTIVE ##
        - Each generation must represent a different apartment variation based on the same user condition.
        - The result should look like a real Korean real estate listing.
        - Avoid perfect showroom style; include slight imperfections.

        ## VARIATION RULE ##
        - Slightly vary layout, lighting, and appliance arrangement for each generation.
        - Ensure each output feels like a distinct apartment, not a duplicate.

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


def _build_edit_system_role():
    return """
        You are editing a realistic Korean real estate room image.

        Return a JSON object with two keys:
        - "prompt": the image edit instruction in English
        - "summary": a short English filename summary (snake_case, max 30 chars)

        Follow these rules:
        - Use the provided original intent as context.
        - Apply only the new edit request.
        - Keep the overall room layout, camera angle, and untouched details as consistent as possible.
        - Do not redesign the whole room unless the edit request explicitly asks for it.
        - Keep the result realistic like a real estate listing photo.
    """


def _generate_single(user_prompt: str, size: str, quality: str, index: int):
    """이미지 1장 생성 (병렬 호출용)"""
    try:
        refined_prompt, file_summary = _refine_prompt(
            user_prompt,
            GEN_GPT_MODEL,
            _build_generate_system_role(),
        )

        print(f"[generate_image] Generating image {index + 1} for: {file_summary}")
        response = client.images.generate(
            model=GEN_DALLE_MODEL,
            prompt=refined_prompt,
            size=size,
            quality=quality,
            n=1,
            response_format="url",
        )

        image_url = response.data[0].url
        return _save_remote_image(image_url, file_summary)
    except Exception as exc:
        print(f"[generate_image] Error on image {index + 1}: {exc}")
        return None


def generate_image(
    user_prompt: str,
    size: str = "1792x1024",
    quality: str = "standard",
    n: int = 4,
):
    image_count = max(1, n)
    max_workers = min(image_count, 4)

    # 최대 4장까지 병렬 생성
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            executor.submit(_generate_single, user_prompt, size, quality, index)
            for index in range(image_count)
        ]
        file_paths = [future.result() for future in futures]

    file_paths = [file_path for file_path in file_paths if file_path is not None]
    return file_paths if file_paths else None


def resolve_saved_image_path(source_image_url: str):
    """프론트에서 선택한 이미지 URL을 create_image 내 로컬 파일 경로로 변환"""
    parsed_url = urlparse(source_image_url)
    file_name = os.path.basename(parsed_url.path)

    if not file_name:
        raise FileNotFoundError("Source image filename could not be resolved.")

    file_path = os.path.join(CREATE_IMAGE_DIR, file_name)

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Source image does not exist: {file_name}")

    return file_path


def _build_edit_prompt(base_prompt: str, edit_prompt: str):
    """기존 생성 프롬프트와 수정 지시를 합쳐 편집용 프롬프트를 구성"""
    combined_prompt = (
        f"Original intent:\n{base_prompt.strip()}\n\n"
        f"Edit request:\n{edit_prompt.strip()}"
    )

    return _refine_prompt(
        combined_prompt,
        GEN_GPT_MODEL,
        _build_edit_system_role(),
    )


def edit_image(
    source_image_url: str,
    base_prompt: str,
    edit_prompt: str,
    size: str = "1024x1024",
    quality: str = "standard",
):
    """
    create_image 폴더에 저장된 원본 이미지를 다시 열어
    이미지 편집 모델로 수정한 뒤 새 파일로 저장합니다.
    """
    image_path = resolve_saved_image_path(source_image_url)
    refined_prompt, file_summary = _build_edit_prompt(base_prompt, edit_prompt)

    with open(image_path, "rb") as image_file:
        response = client.images.edit(
            model=EDIT_IMAGE_MODEL,
            image=image_file,
            prompt=refined_prompt,
            size=size,
            quality=quality,
            n=1,
            response_format="url",
        )

    image_url = response.data[0].url
    return _save_remote_image(image_url, file_summary, prefix="edit")
