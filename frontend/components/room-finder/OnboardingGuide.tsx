"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface Step {
  title: string;
  description: string;
  position: "top" | "bottom" | "center";
  highlight?: "search" | "filter" | "map" | "panel";
}

const steps: Step[] = [
  {
    title: "지역 검색",
    description: "찾고자 하는 지역을 검색해보세요. 원하는 동네나 지하철역을 입력하면 해당 지역으로 이동해요.",
    position: "bottom",
    highlight: "search",
  },
  {
    title: "필터 설정",
    description: "전/월세, 보증금, 방 구조 등 원하는 조건으로 매물을 필터링할 수 있어요.",
    position: "bottom",
    highlight: "filter",
  },
  {
    title: "지도에서 탐색",
    description: "지도의 클러스터를 클릭하면 해당 지역 매물을 확인할 수 있어요. 숫자가 클수록 매물이 많아요.",
    position: "center",
    highlight: "map",
  },
  {
    title: "AI 이미지 검색",
    description: "AI 추천 탭에서 원하는 방 스타일을 텍스트로 입력하면 AI가 이미지를 생성하고 유사한 매물을 찾아드려요.",
    position: "top",
    highlight: "panel",
  },
];

interface OnboardingGuideProps {
  userId: number;
}

export function OnboardingGuide({ userId }: OnboardingGuideProps) {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const key = `hasSeenGuide_${userId}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      // 약간 딜레이 후 표시 (지도 로딩 후)
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [userId]);

  const handleClose = () => {
    localStorage.setItem(`hasSeenGuide_${userId}`, "true");
    setVisible(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!visible) return null;

  const step = steps[currentStep];

  const highlightClass = {
    search: "top-[49px] left-0 right-0 h-[62px]",
    filter: "top-[96px] left-0 right-0 h-[81px]",
    map: "top-[177px] left-0 right-[450px] bottom-0",
    panel: "top-[177px] right-0 w-[450px] bottom-0",
  };

  const tooltipPosition = {
    top: "bottom-8",
    bottom: "top-[180px]",
    center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  };

  return (
    <div className="fixed inset-0 z-[100] hidden lg:block">
      {/* 어두운 오버레이 */}
      <div className="absolute inset-0 bg-black/50" />

      {/* 강조 영역 */}
      {step.highlight && (
        <div
          className={cn(
            "absolute border-2 border-warm-brown rounded-lg",
            highlightClass[step.highlight]
          )}
          style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)" }}
        />
      )}

      {/* 툴팁 */}
      <div
        className={cn(
          "absolute w-[320px] bg-white rounded-2xl shadow-2xl p-5",
          step.position === "center"
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            : "left-1/2 -translate-x-1/2 " + tooltipPosition[step.position]
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-bold text-stone-900">{step.title}</h3>
          <button onClick={handleClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-stone-600 leading-relaxed mb-4">{step.description}</p>

        {/* 스텝 인디케이터 */}
        <div className="flex justify-center gap-1.5 mb-4">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                idx === currentStep ? "w-4 bg-warm-brown" : "w-1.5 bg-stone-200"
              )}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {currentStep > 0 ? (
            <button
              onClick={handlePrev}
              className="flex-1 py-2.5 text-sm font-semibold text-stone-500 border border-stone-200 rounded-xl hover:bg-stone-50"
            >
              이전
            </button>
          ) : (
            <div className="flex-1" />
          )}
          <button
            onClick={handleNext}
            className="flex-1 py-2.5 text-sm font-semibold bg-warm-brown text-white rounded-xl hover:opacity-90"
          >
            {currentStep === steps.length - 1 ? "시작하기 →" : "다음 →"}
          </button>
        </div>
      </div>
    </div>
  );
}
