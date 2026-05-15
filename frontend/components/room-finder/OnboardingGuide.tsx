"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/store/onboardingStore";

interface Slide {
  tag: string;
  title: string;
  description: string;
  image: string;
  objectPosition?: string;
  isVideo?: boolean;
}

const slides: Slide[] = [
  {
    tag: "지역 검색",
    title: "원하는 지역을 검색해보세요",
    description: "역이나 동네 이름을 입력하면 해당 위치로 이동해요. 화면 상단 검색창을 이용해보세요.",
    image: "/onboarding-search.png",
    objectPosition: "top",
  },
  {
    tag: "필터 설정",
    title: "조건에 맞는 매물만 골라보세요",
    description: "전세/월세, 보증금, 방 구조, 층수 등 다양한 조건으로 원하는 매물을 좁혀보세요.",
    image: "/onboarding-filter.png",
    objectPosition: "top",
  },
  {
    tag: "지도 탐색",
    title: "지도에서 매물을 탐색하세요",
    description: "지도 위 숫자를 클릭하면 해당 위치의 매물을 확인할 수 있어요. 숫자가 클수록 근처 매물이 많아요.",
    image: "/onboarding-map.png",
    objectPosition: "center",
  },
  {
    tag: "AI 이미지 검색",
    title: "원하는 방을 그림으로 찾아요",
    description: "AI추천 탭에서 원하는 방 분위기를 텍스트로 설명하면 AI가 이미지를 생성하고, 비슷한 실제 매물을 찾아드려요.",
    image: "/onboarding-ai.mp4",
    isVideo: true,
  },
  {
    tag: "시작하기",
    title: "금방에서 내 집을 찾아보세요!",
    description: "이제 금방의 모든 기능을 사용할 준비가 됐어요. 원하는 매물을 찾아보세요!",
    image: "/onboarding-main.png",
    objectPosition: "center",
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
    if (currentStep < slides.length - 1) {
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

  const slide = slides[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="w-[600px] max-w-[90vw] overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* 이미지/비디오 영역 */}
        <div className="relative h-[320px] w-full overflow-hidden bg-stone-50">
          {slide.isVideo ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-contain"
            >
              <source src={slide.image} type="video/mp4" />
            </video>
          ) : (
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              unoptimized
              className="object-contain transition-all duration-300"
              style={{ objectPosition: slide.objectPosition ?? "center" }}
            />
          )}

          {/* 닫기 버튼 */}
          <button
            onClick={handleClose}
            className="absolute right-3 top-3 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
          >
            <X className="h-4 w-4" />
          </button>

          {/* 도트 인디케이터 */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  idx === currentStep ? "w-5 bg-warm-brown" : "w-2 bg-stone-300"
                )}
              />
            ))}
          </div>
        </div>

        {/* 텍스트 영역 */}
        <div className="p-6">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-warm-brown">
            {slide.tag}
          </p>
          <h2 className="mb-2 text-[17px] font-bold leading-snug text-stone-900">
            {slide.title}
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-stone-500">
            {slide.description}
          </p>

          <div className="flex gap-2">
            {currentStep > 0 ? (
              <button
                onClick={handlePrev}
                className="flex-1 cursor-pointer rounded-xl border border-stone-200 py-2.5 text-sm font-semibold text-stone-500 hover:bg-stone-50"
              >
                이전
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="flex-1 cursor-pointer rounded-xl border border-stone-200 py-2.5 text-sm font-semibold text-stone-400 hover:bg-stone-50"
              >
                건너뛰기
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 cursor-pointer rounded-xl bg-warm-brown py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              {currentStep === slides.length - 1 ? "시작하기!" : "다음 →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}