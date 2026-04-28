import base64
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

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
client = OpenAI(api_key=OPENAI_API_KEY)
GEN_PROMPT_MODEL = os.getenv("IMAGE_GEN_GPT_MODEL", "gpt-4o")
GEN_IMAGE_MODEL = os.getenv("IMAGE_GEN_IMAGE_MODEL") or "gpt-image-1"
EDIT_PROMPT_MODEL = os.getenv("IMAGE_EDIT_GPT_MODEL") or GEN_PROMPT_MODEL
EDIT_IMAGE_MODEL = os.getenv("IMAGE_EDIT_IMAGE_MODEL") or "gpt-image-1"

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
    return _save_image_bytes(image_data, file_summary, prefix=prefix)


def _save_base64_image(image_base64: str, file_summary: str, prefix: str = ""):
    image_data = base64.b64decode(image_base64)
    return _save_image_bytes(image_data, file_summary, prefix=prefix)


def _save_image_bytes(image_data: bytes, file_summary: str, prefix: str = ""):
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

        Create a GPT Image prompt for a realistic Korean studio apartment (one-room).
        Return a JSON object with two keys:
        - "prompt": the detailed image generation prompt in English
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
        - The new edit request must be visibly applied in the final image.
        - If the original image conflicts with the new edit request, prioritize the new edit request.
        - Apply only the requested change and keep everything else as consistent as possible.
        - Keep the overall room layout, camera angle, and untouched details as consistent as possible.
        - Do not redesign the whole room unless the edit request explicitly asks for it.
        - Keep the result realistic like a real estate listing photo.
    """


def _normalize_image_size(size: str):
    """GPT Image에서 지원하는 크기로 정규화"""
    supported_sizes = {"1024x1024", "1536x1024", "1024x1536", "auto"}
    size_aliases = {
        "1792x1024": "1536x1024",
        "1024x1792": "1024x1536",
    }

    normalized_size = size_aliases.get(size, size)
    return normalized_size if normalized_size in supported_sizes else "1024x1024"


def _normalize_image_quality(quality: str):
    """이미지 생성 품질은 항상 medium으로 고정"""
    return "medium"


def _generate_single(user_prompt: str, size: str, quality: str, index: int):
    """이미지 1장 생성 (병렬 호출용)"""
    try:
        refined_prompt, file_summary = _refine_prompt(
            user_prompt,
            GEN_PROMPT_MODEL,
            _build_generate_system_role(),
        )
        normalized_size = _normalize_image_size(size)
        normalized_quality = _normalize_image_quality(quality)

        print(f"[generate_image] Generating image {index + 1} for: {file_summary}")
        response = client.images.generate(
            model=GEN_IMAGE_MODEL,
            prompt=refined_prompt,
            size=normalized_size,
            quality=normalized_quality,
            n=1,
        )

        image_base64 = response.data[0].b64_json
        return _save_base64_image(image_base64, file_summary)
    except Exception as exc:
        print(f"[generate_image] Error on image {index + 1}: {exc}")
        return None


def generate_image(
    user_prompt: str,
    size: str = "1792x1024",
    quality: str = "medium",
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
        f"Edit request:\n{edit_prompt.strip()}\n\n"
        "Important:\n"
        "- The requested change must be clearly visible in the edited image.\n"
        "- Preserve the room as much as possible, but do not ignore the edit request.\n"
        "- If the request asks to move, swap, add, remove, enlarge, or replace something, that change must be explicit."
    )

    return _refine_prompt(
        combined_prompt,
        EDIT_PROMPT_MODEL,
        _build_edit_system_role(),
    )


def _build_edit_batch_prompt(refined_prompt: str, image_count: int):
    """한 번의 수정 요청으로 여러 결과를 생성하기 위한 변주 지시를 추가"""
    return (
        f"{refined_prompt}\n\n"
        "Output requirement:\n"
        f"- Generate {image_count} edited variations.\n"
        "- Every variation must clearly apply the requested edit.\n"
        "- Keep the overall room and camera angle close to the original image.\n"
        "- Vary lighting, crop, textures, and small surrounding details across the variations so the outputs are not identical."
    )


def _upload_image_file_to_openai(image_path: str):
    """로컬 원본 이미지를 OpenAI Files API에 업로드하고 file_id를 반환"""
    with open(image_path, "rb") as image_file:
        uploaded_file = client.files.create(
            file=image_file,
            purpose="vision",
        )

    return uploaded_file.id


def _request_gpt_image_edit(file_id: str, prompt: str, size: str, n: int):
    """file_id 기반 GPT Image 편집 요청을 전송하고 base64 이미지 목록을 반환"""
    normalized_size = _normalize_image_size(size)
    response = requests.post(
        "https://api.openai.com/v1/images/edits",
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": EDIT_IMAGE_MODEL,
            "images": [{"file_id": file_id}],
            "prompt": prompt,
            "size": normalized_size,
            "n": n,
        },
        timeout=180,
    )
    response.raise_for_status()

    response_body = response.json()
    return [item["b64_json"] for item in response_body["data"] if item.get("b64_json")]


def edit_image(
    source_image_url: str,
    base_prompt: str,
    edit_prompt: str,
    size: str = "1024x1024",
    n: int = 4,
):
    """
    create_image 폴더에 저장된 원본 이미지를 다시 열어
    이미지 편집 모델로 수정한 뒤 새 파일로 저장합니다.
    """
    image_path = resolve_saved_image_path(source_image_url)
    refined_prompt, file_summary = _build_edit_prompt(base_prompt, edit_prompt)
    uploaded_file_id = _upload_image_file_to_openai(image_path)
    image_count = max(1, n)
    batch_prompt = _build_edit_batch_prompt(refined_prompt, image_count)

    try:
        print(f"[edit_image] Editing {image_count} images for: {file_summary}")
        image_base64_list = _request_gpt_image_edit(
            file_id=uploaded_file_id,
            prompt=batch_prompt,
            size=size,
            n=image_count,
        )
    finally:
        try:
            client.files.delete(uploaded_file_id)
        except Exception as exc:
            print(f"[edit_image] Failed to delete uploaded source file: {exc}")

    file_paths = [
        _save_base64_image(image_base64, file_summary, prefix="edit")
        for image_base64 in image_base64_list
    ]
    return file_paths if file_paths else None
