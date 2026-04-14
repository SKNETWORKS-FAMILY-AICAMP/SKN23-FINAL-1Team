import os
import concurrent.futures
from ai_image_service import generate_image, evaluate_image_quality, GEN_GPT_MODEL, GEN_DALLE_MODEL
import time
import csv
from datetime import datetime

def save_to_csv(results):
    """
    실험 결과를 CSV 파일에 저장합니다. (메타데이터 완벽 포함)
    """
    csv_file = "evaluation_results.csv"
    file_exists = os.path.isfile(csv_file)
    
    with open(csv_file, mode="a", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        # 헤더 업데이트 (Judge_Model 추가!)
        if not file_exists:
            writer.writerow(["Timestamp", "Prompt", "GPT_Model", "DALL-E_Model", "Judge_Model", "Image_Path", "Score", "Reason"])
        
        for res in results:
            if res:
                writer.writerow([
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    res.get("prompt", "Unknown"),
                    GEN_GPT_MODEL,
                    GEN_DALLE_MODEL,
                    res["evaluation"].get("model", "unknown"), # 채점한 모델
                    res.get("path", "N/A"),
                    res["evaluation"].get("score", 0),
                    res["evaluation"].get("reason", "").replace("\n", " ")
                ])
    print(f"\n[기록 완료] 실험 결과(채점 모델 포함)가 {csv_file}에 저장되었습니다.")

def parallel_generate_and_evaluate(prompts):
    results = [None] * len(prompts)
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(prompts)) as executor:
        future_to_prompt = {
            executor.submit(generate_image, prompt, size="1024x1024"): i 
            for i, prompt in enumerate(prompts)
        }
        for future in concurrent.futures.as_completed(future_to_prompt):
            index = future_to_prompt[future]
            prompt = prompts[index]
            try:
                path_list = future.result()
                if path_list and path_list[0]:
                    image_path = path_list[0]
                    print(f"[성공] 이미지 {index + 1} 생성 완료. 평가 중...")
                    evaluation = evaluate_image_quality(prompt, image_path)
                    results[index] = {
                        "prompt": prompt,
                        "path": image_path,
                        "evaluation": evaluation
                    }
            except Exception as e:
                print(f"[실패] 이미지 {index + 1} 작업 중 오류: {e}")
    return results

if __name__ == "__main__":
    user_preference_prompts = [
        "화이트 톤의 깔끔하고 세련된 모던 원룸 인테리어",
        "원목 가구와 화분이 있는 포근한 내추럴 거실",
        "노출 콘크리트와 철제 가구가 있는 빈티지한 방",
        "대리석 바닥과 화려한 조명이 있는 고급스러운 빌라 내부"
    ]
    print(f"--- 이미지 생성 및 다중 AI 평가 파이프라인 시작 ---")
    start_time = time.time()
    final_results = parallel_generate_and_evaluate(user_preference_prompts)
    end_time = time.time()
    
    print(f"\n--- 공정 완료 ({end_time - start_time:.2f}초) ---\n")
    
    for i, res in enumerate(final_results):
        if res:
            print(f"[{i+1}] {res['evaluation'].get('score')}점 ({res['evaluation'].get('model')})")
            print(f" - 이유: {res['evaluation'].get('reason')[:100]}...")
    
    save_to_csv(final_results)
