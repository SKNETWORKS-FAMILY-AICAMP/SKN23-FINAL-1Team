import requests
import os
from dotenv import load_dotenv
from datetime import datetime
from zoneinfo import ZoneInfo

# KST 타임존 설정
KST = ZoneInfo("Asia/Seoul")

# .env 로드
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(ROOT_DIR, ".env"))

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

def send_discord_message(content: str):
    """디스코드로 메시지를 전송합니다."""
    if not DISCORD_WEBHOOK_URL:
        print("⚠️ 경고: DISCORD_WEBHOOK_URL이 설정되지 않았어! .env 확인해라.")
        return

    data = {
        "content": content,
        "username": "직방 크롤러 봇 🤖"
    }
    
    try:
        response = requests.post(DISCORD_WEBHOOK_URL, json=data)
        response.raise_for_status()
    except Exception as e:
        print(f"❌ 디코 알림 전송 실패: {e}")

def send_crawler_report(title: str, stats: dict, color: int = 0x00ff00):
    """
    디스코드로 멋진 임베드(Embed) 형식의 리포트를 보냅니다.
    stats 예시: {"신규 매물": 100, "삭제 매물": 50, "소요 시간": "5분"}
    """
    if not DISCORD_WEBHOOK_URL:
        return

    now_str = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S")
    
    # 임베드 구조 생성
    embed = {
        "title": f"📊 {title}",
        "description": f"수집 일시: `{now_str}`",
        "color": color,
        "fields": []
    }

    for name, value in stats.items():
        embed["fields"].append({
            "name": name,
            "value": str(value),
            "inline": True
        })

    payload = {
        "username": "직방 크롤러 봇 🤖",
        "embeds": [embed]
    }

    try:
        response = requests.post(DISCORD_WEBHOOK_URL, json=payload)
        response.raise_for_status()
    except Exception as e:
        print(f"❌ 디코 임베드 전송 실패: {e}")
