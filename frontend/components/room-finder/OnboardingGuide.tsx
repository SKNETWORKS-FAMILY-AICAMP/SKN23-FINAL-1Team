"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/store/onboardingStore";

interface Step {
  title: string;
  description: string;
  position: "top" | "bottom" | "center";
  highlight?: "search" | "filter" | "map" | "panel";
}

const steps: Step[] = [
  {
    title: "지역 검색",
    description:
      "찾고 싶은 지역을 검색해보세요. 역이나 동네 이름을 입력하면 해당 위치로 이동해요.",
    position: "bottom",
    highlight: "search",
  },
  {
    title: "필터 설정",
    description:
      "전세, 보증금, 월세, 구조 같은 조건으로 매물을 더 쉽게 좁혀볼 수 있어요.",
    position: "bottom",
    highlight: "filter",
  },
  {
    title: "지도에서 탐색",
    description:
      "지도 위 마커를 누르면 해당 위치의 매물을 확인할 수 있어요. 숫자가 크면 근처 매물이 많다는 뜻이에요.",
    position: "center",
    highlight: "map",
  },
  {
    title: "AI 이미지 검색",
    description:
      "AI 추천 영역에 원하는 방 분위기를 텍스트로 입력하면 비슷한 매물을 찾아드려요.",
    position: "center",
    highlight: "panel",
  },
];

interface OnboardingGuideProps {
  userId?: number;
}

export function OnboardingGuide({ userId }: OnboardingGuideProps) {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const isOpen = useOnboardingStore((state) => state.isOpen);
  const closeGuide = useOnboardingStore((state) => state.closeGuide);

  useEffect(() => {
    const key = userId ? `hasSeenGuide_${userId}` : "hasSeenGuide_guest";
    const seen = localStorage.getItem(key);

    if (!seen) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [userId]);

  useEffect(() => {
    if (!isOpen) return;

    setCurrentStep(0);
    setVisible(true);
    closeGuide();
  }, [isOpen, closeGuide]);

  const handleClose = () => {
    const key = userId ? `hasSeenGuide_${userId}` : "hasSeenGuide_guest";
    localStorage.setItem(key, "true");
    setVisible(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      return;
    }

    handleClose();
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
      {step.highlight && (
        <div
          className={cn(
            "absolute rounded-lg border-2 border-warm-brown",
            highlightClass[step.highlight],
          )}
          style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)" }}
        />
      )}

      <div
        className={cn(
          "absolute w-[320px] rounded-2xl bg-white p-5 shadow-2xl",
          step.position === "center"
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            : "left-1/2 -translate-x-1/2 " + tooltipPosition[step.position],
        )}
      >
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-base font-bold text-stone-900">{step.title}</h3>
          <button
            onClick={handleClose}
            className="cursor-pointer text-stone-400 hover:text-stone-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-stone-600">
          {step.description}
        </p>

        <div className="mb-4 flex justify-center gap-1.5">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                idx === currentStep ? "w-4 bg-warm-brown" : "w-1.5 bg-stone-200",
              )}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {currentStep > 0 ? (
            <button
              onClick={handlePrev}
              className="cursor-pointer flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-semibold text-stone-500 hover:bg-stone-50"
            >
              이전
            </button>
          ) : (
            <div className="flex-1" />
          )}

          <button
            onClick={handleNext}
            className="cursor-pointer flex-1 rounded-xl bg-warm-brown py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            {currentStep === steps.length - 1 ? "시작하기" : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}
