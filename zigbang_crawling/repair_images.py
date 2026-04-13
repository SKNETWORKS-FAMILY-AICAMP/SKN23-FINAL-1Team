import os
import sys

# 현재 디렉토리를 경로에 추가해서 processor를 불러올 수 있게 함
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    import processor
    print("=" * 50)
    print("   [DB 이미지 주소 복구 도구]   ")
    print("=" * 50)
    
    # processor.py에 추가한 복구 함수 실행
    processor.repair_image_urls_in_db()
    
    print("\n" + "=" * 50)
    print("작업이 완료되었습니다. DB를 확인해보세요!")
    print("=" * 50)
except ImportError:
    print("[에러] processor.py 파일을 찾을 수 없습니다.")
except Exception as e:
    print(f"[에러] 복구 작업 중 오류 발생: {e}")
