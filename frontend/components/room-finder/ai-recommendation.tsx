"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Listing } from "./map-view";
import { useAuthStore } from "@/store/authStore";
import {
  composePromptHistory,
  type AIGeneratedImage,
  useAIImageSessionStore,
} from "@/store/aiImageSessionStore";

interface AIRecommendationProps {
  onSimilarListingsFound: (listings: Listing[]) => void;
  allListings: Listing[];
  compact?: boolean;
}

type GeneratedImageResponse = {
  id: string;
  url: string;
};

const QUICK_PROMPTS = [
  "복층 구조로 만들어줘",
  "넓은 주방으로 만들어줘",
  "채광 좋게 만들어줘",
  "미니멀하게 만들어줘",
];

function buildSessionImages(
  images: GeneratedImageResponse[],
  promptHistory: string[],
  editCount: number,
): AIGeneratedImage[] {
  const composedPrompt = composePromptHistory(promptHistory);

  return images.map((image) => ({
    ...image,
    prompt: composedPrompt,
    promptHistory: [...promptHistory],
    editCount,
  }));
}

export function AIRecommendation({
  onSimilarListingsFound,
  allListings,
  compact = false,
}: AIRecommendationProps) {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const hasHydrated = useAIImageSessionStore((state) => state.hasHydrated);
  const screen = useAIImageSessionStore((state) => state.screen);
  const generatedImages = useAIImageSessionStore((state) => state.generatedImages);
  const selectedImageId = useAIImageSessionStore((state) => state.selectedImageId);
  const replaceSession = useAIImageSessionStore((state) => state.replaceSession);
  const setSelectedImageId = useAIImageSessionStore(
    (state) => state.setSelectedImageId,
  );
  const resetSessionStore = useAIImageSessionStore((state) => state.resetSession);

  const [prompt, setPrompt] = useState("");
  const [regenPrompt, setRegenPrompt] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFindingSimilar, setIsFindingSimilar] = useState(false);

  const selectedImage = useMemo(
    () => generatedImages.find((image) => image.id === selectedImageId) ?? null,
    [generatedImages, selectedImageId],
  );

  const remainingEdits = user?.remain ?? 0;

  useEffect(() => {
    setEditPrompt("");
  }, [selectedImageId]);

  const requestGeneratedImages = async (nextPromptHistory: string[]) => {
    console.log("[AIRecommendation] generate prompt:", nextPromptHistory[0]);
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: composePromptHistory(nextPromptHistory),
        mode: "generate",
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.error ?? "이미지 생성에 실패했습니다.");
    }

    const data = (await response.json()) as { images?: GeneratedImageResponse[] };
    return buildSessionImages(data.images ?? [], nextPromptHistory, 0);
  };

  const requestEditedImage = async (
    sourceImageUrl: string,
    userId: number,
    basePrompt: string,
    editRequest: string,
    nextPromptHistory: string[],
    nextEditCount: number,
  ) => {
    console.log("[AIRecommendation] edit prompt:", editRequest);
    const response = await fetch("/api/edit-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        sourceImageUrl,
        basePrompt,
        editPrompt: editRequest,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.error ?? "이미지 수정에 실패했습니다.");
    }

    const data = (await response.json()) as {
      images?: GeneratedImageResponse[];
      remain?: number;
      credit?: number;
    };
    return {
      images: buildSessionImages(data.images ?? [], nextPromptHistory, nextEditCount),
      remain: data.remain,
      credit: data.credit,
    };
  };

  const handleGenerate = async (overridePrompt?: string) => {
    const activePrompt = (overridePrompt ?? prompt).trim();
    if (!activePrompt || isGenerating) return;

    setIsGenerating(true);
    setMessage("");
    setSelectedImageId(null);

    try {
      const nextImages = await requestGeneratedImages([activePrompt]);
      replaceSession(nextImages);
      setRegenPrompt("");
    } catch (error) {
      console.error("Error generating images:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "이미지 생성에 실패했습니다. 다시 시도해주세요.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectImage = (imageId: string) => {
    setSelectedImageId(selectedImageId === imageId ? null : imageId);
  };

  const handleEdit = async () => {
    const trimmedEditPrompt = editPrompt.trim();

    if (!selectedImage || !trimmedEditPrompt || isEditing) return;
    if (!user?.user_id) {
      setMessage("로그인 후 이미지 수정이 가능합니다.");
      return;
    }
    if (remainingEdits <= 0) {
      setMessage("남은 수정 횟수가 없습니다.");
      return;
    }

    setIsEditing(true);
    setMessage("");

    try {
      const nextPromptHistory = [...selectedImage.promptHistory, trimmedEditPrompt];
      const nextEditCount = selectedImage.editCount + 1;
      const result = await requestEditedImage(
        selectedImage.url,
        user.user_id,
        selectedImage.prompt,
        trimmedEditPrompt,
        nextPromptHistory,
        nextEditCount,
      );

      replaceSession(result.images);
      updateUser({
        remain: result.remain ?? user.remain,
        credit: result.credit ?? user.credit,
      });
      setEditPrompt("");
    } catch (error) {
      console.error("Error editing images:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "선택한 이미지 수정에 실패했습니다.",
      );
    } finally {
      setIsEditing(false);
    }
  };

  const handleFindSimilar = async () => {
    if (!selectedImage || isFindingSimilar) return;

    setIsFindingSimilar(true);
    setMessage("");

    try {
      if (user?.user_id) {
        const galleryResponse = await fetch("/api/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.user_id,
            image_url: selectedImage.url,
            prompt: selectedImage.prompt,
          }),
        });

        if (!galleryResponse.ok) {
          const errorText = await galleryResponse.text();
          console.error(
            "Gallery save failed:",
            galleryResponse.status,
            errorText,
          );
        }
      }

      const response = await fetch("/api/find-similar-rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: selectedImage.url }),
      });

      if (!response.ok) {
        throw new Error("유사 매물 검색에 실패했습니다.");
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        onSimilarListingsFound(data.items as Listing[]);
      } else {
        onSimilarListingsFound(allListings.slice(0, 4));
      }
    } catch (error) {
      console.error("Error finding similar rooms:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "유사 매물 검색에 실패했습니다.",
      );
      onSimilarListingsFound(allListings.slice(0, 4));
    } finally {
      setIsFindingSimilar(false);
    }
  };

  const handleReset = () => {
    resetSessionStore();
    setPrompt("");
    setRegenPrompt("");
    setEditPrompt("");
    setMessage("");
  };

  if (!hasHydrated) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8 text-xs text-stone-400">
        AI 세션을 불러오는 중...
      </div>
    );
  }

  if (compact) {
    return (
      <div className="border-t border-border-warm bg-linen p-3 md:p-4">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <span className="shrink-0 text-xs text-neutral-muted md:text-sm">
            {message || "원하는 방 조건을 입력하면 4개의 이미지를 생성해드려요."}
          </span>
          <div className="flex w-full items-center gap-2 sm:flex-1">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="다시 생성하려면 프롬프트를 입력하세요..."
              className="flex-1 rounded-lg border border-border-warm bg-linen px-3 py-2 text-xs text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:ring-2 focus:ring-warm-brown/50 md:text-sm"
            />
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !prompt.trim()}
              className="rounded-lg border border-border-warm bg-linen px-3 py-2 text-xs font-medium text-neutral-dark disabled:cursor-not-allowed disabled:opacity-50 md:px-4 md:text-sm"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "입력"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {screen === "init" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-5 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e8e0d5] bg-[#f5f0eb]">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect
                x="2.5"
                y="2.5"
                width="21"
                height="21"
                rx="3.5"
                stroke="#a8896c"
                strokeWidth="1.5"
              />
              <circle
                cx="8.5"
                cy="8.5"
                r="2"
                stroke="#a8896c"
                strokeWidth="1.5"
              />
              <path
                d="M2.5 18l6-6 4 4 3.5-3.5 8 8"
                stroke="#a8896c"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="text-center">
            <p className="mb-1 text-sm font-semibold text-stone-800">
              원하는 방 구조를 설명해주세요
            </p>
            <p className="text-xs leading-relaxed text-stone-500">
              설명한 내용을 바탕으로 AI가
              <br />
              이미지를 만들어드려요
            </p>
          </div>

          <div className="flex w-full flex-col gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="예) 복층 구조에 채광 좋은 원룸..."
              className="w-full rounded-xl border border-[#d6cfc8] bg-[#faf7f4] px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:bg-white focus:outline-none"
            />
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !prompt.trim()}
              className="w-full rounded-xl bg-stone-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                "이미지 생성하기!"
              )}
            </button>
          </div>

          <div className="grid w-full grid-cols-2 gap-2">
            {QUICK_PROMPTS.map((quickPrompt) => (
              <button
                key={quickPrompt}
                onClick={() => {
                  setPrompt(quickPrompt);
                  handleGenerate(quickPrompt);
                }}
                className="overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-[#e8e0d5] bg-[#faf7f4] px-3 py-2 text-xs text-stone-500 transition-all hover:border-[#a8896c] hover:bg-[#f5f0eb] hover:text-[#a8896c]"
              >
                {quickPrompt}
              </button>
            ))}
          </div>

          {message && <p className="text-center text-xs text-red-500">{message}</p>}
        </div>
      )}

      {screen === "generated" && (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid grid-cols-2 gap-2 pb-2">
              {generatedImages.map((image, index) => {
                const isSelected = selectedImage?.id === image.id;
                const isDimmed = selectedImage !== null && !isSelected;

                return (
                  <div
                    key={image.id}
                    onClick={() => handleSelectImage(image.id)}
                    className={cn(
                      "relative aspect-square cursor-pointer overflow-hidden rounded-xl border-2 transition-all duration-150",
                      isSelected ? "border-stone-600" : "border-transparent",
                      isDimmed && "opacity-30",
                    )}
                  >
                    <Image
                      src={image.url}
                      alt={image.prompt}
                      fill
                      unoptimized
                      className="object-cover"
                    />

                    {isSelected && (
                      <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-stone-700">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <polyline
                            points="1.5,5 4,7.5 8.5,2.5"
                            stroke="white"
                            strokeWidth="2.5"
                          />
                        </svg>
                      </div>
                    )}

                    <div className="absolute bottom-2 right-2 rounded bg-black/45 px-1.5 py-0.5 text-[10px] text-white">
                      {index + 1}/4
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!selectedImage && (
            <div className="shrink-0 border-t border-[#e8e0d5] px-3 py-3">
              <p className="mb-2 text-center text-xs text-stone-500">
                마음에 드는 이미지를 선택하세요
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={regenPrompt}
                  onChange={(e) => setRegenPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate(regenPrompt)}
                  placeholder="다른 스타일로 바꿔볼까요?"
                  className="flex-1 rounded-lg border border-[#d6cfc8] bg-white px-3 py-2 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400/40"
                />
                <button
                  onClick={() => handleGenerate(regenPrompt)}
                  disabled={isGenerating || !regenPrompt.trim()}
                  className="self-end whitespace-nowrap rounded-lg bg-stone-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "재생성"
                  )}
                </button>
              </div>

              <button
                onClick={handleReset}
                className="mt-2 block w-full text-center text-xs text-stone-400 transition-colors hover:text-stone-600"
              >
                ← 처음으로
              </button>
            </div>
          )}

          {selectedImage && (
            <div className="shrink-0 border-t border-[#e8e0d5] px-3 py-3 flex flex-col gap-2">
              <div className="rounded-xl border border-[#e8e0d5] bg-[#faf7f4] p-2.5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold leading-relaxed text-stone-700">
                      조금 더 바꾸고 싶다면? 구체적일수록 잘 반영돼요
                    </p>
                    <p className="mt-1 text-[10px] text-stone-400">
                      현재 남은 수정 횟수: {remainingEdits}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleReset}
                      className="text-[10px] font-semibold text-stone-400 transition-colors hover:text-stone-600"
                    >
                      초기화
                    </button>
                    <button
                      onClick={() => setSelectedImageId(null)}
                      className="mt-0.5 shrink-0 text-sm leading-none text-stone-400 transition-colors hover:text-stone-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                    placeholder={
                      remainingEdits > 0
                        ? "변경사항을 입력하세요..."
                        : "남은 수정 횟수가 없습니다"
                    }
                    disabled={remainingEdits === 0}
                    className="flex-1 rounded-lg border border-[#d6cfc8] bg-white px-3 py-2 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400/40 disabled:cursor-not-allowed disabled:bg-stone-100"
                  />
                  <button
                    onClick={handleEdit}
                    disabled={isEditing || !editPrompt.trim() || remainingEdits === 0}
                    className="whitespace-nowrap rounded-lg bg-stone-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isEditing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "수정하기!"
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-[#e8e0d5]" />
                <span className="text-[10px] text-stone-400">
                  이 이미지가 마음에 든다면
                </span>
                <div className="h-px flex-1 bg-[#e8e0d5]" />
              </div>

              <button
                onClick={handleFindSimilar}
                disabled={isFindingSimilar}
                className="w-full rounded-xl bg-stone-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isFindingSimilar ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  "이 이미지로 유사 매물 검색 →"
                )}
              </button>

              {message && <p className="text-center text-xs text-red-500">{message}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
