import os
import concurrent.futures
from ai_image_service import generate_image
import time

def parallel_generate_images(prompts):
    """
    여러 개의 프롬프트를 병렬로 실행하여 로컬 저장 경로를 리스트로 반환합니다.
    """
    # 결과가 들어갈 자리를 미리 만들어둡니다.
    results = [None] * len(prompts)
    
    # ThreadPoolExecutor를 사용하여 병렬 작업 수행 (4개 스레드 사용)
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(prompts)) as executor:
        # 각 프롬프트에 대해 generate_image 함수를 비동기적으로 실행
        # 인자(prompt, size)를 submit에 함께 넘겨줍니다.
        future_to_prompt = {
            executor.submit(generate_image, prompt, size="1024x1024"): i 
            for i, prompt in enumerate(prompts)
        }
        
        # 완료된 작업부터 순서대로 결과 처리
        for future in concurrent.futures.as_completed(future_to_prompt):
            index = future_to_prompt[future]
            try:
                path_list = future.result()
                if path_list:
                    # 결과값(로컬 경로)을 results 리스트의 제자리에 채워넣습니다.
                    results[index] = path_list[0]
                    print(f"[성공] 이미지 {index + 1} 병렬 생성 및 저장 완료")
            except Exception as e:
                print(f"[실패] 이미지 {index + 1} 생성 중 오류 발생: {e}")
                
    return results

if __name__ == "__main__":
    # 1. 4가지 서로 다른 스타일의 한글 프롬프트 정의
    user_preference_prompts = [
        "보증금 200정도에 월세 30정도인 좋은 원룸",
        "보증금 1000정도에 월세 100정도의 넓은 원룸",
        "냉장고, 에어컨, 세탁기, 인덕션이 갖춰진 풀옵션 원룸",
        "곰팡이 안피는 반지하 자취방 원룸"
    ]

    print("--- 4장 병렬 생성 및 로컬 저장 시작 (속도 단축 중...) ---")
    
    # 2. 병렬 실행
    start_time = time.time()
    final_paths = parallel_generate_images(user_preference_prompts)
    end_time = time.time()
    
    # 3. 결과 출력
    print(f"\n--- 전체 생성 완료 (소요 시간: {end_time - start_time:.2f}초) ---")
    print("--- 결과 확인: backend/create_image 폴더 ---")
    
    for i, path in enumerate(final_paths):
        if path:
            print(f"스타일 {i+1} 저장 경로: {path}")
        else:
            print(f"스타일 {i+1}: 생성 실패")
