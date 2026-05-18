"use client";

import { type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { HouseCatchGame } from "@/components/room-finder/HouseCatchGame";
import type { Listing } from "./map-view";
import { useAuthStore } from "@/store/authStore";
import {
  composeDisplayPromptHistory,
  composePromptHistory,
  type AIPendingJob,
  type AIImageGroup,
  type AIGeneratedImage,
  useAIImageSessionStore,
} from "@/store/aiImageSessionStore";
import { buildSearchBody, type RoomSearchParams } from "@/lib/api/rooms";
import { mapSimilarItemToListing } from "@/utils/roomMappers";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

interface AIRecommendationProps {
  onSimilarListingsFound: (listings: Listing[], imageUrl?: string) => void;
  allListings: Listing[];
  similarSearchParams?: RoomSearchParams;
  compact?: boolean;
  onPhotoClick?: (images: string[], index: number) => void;
  canFindSimilarRooms?: boolean;
  onFindSimilarBlocked?: () => void;
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

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg"];
const IMAGE_JOB_POLL_INTERVAL_MS = 2000;
const IMAGE_JOB_MAX_ATTEMPTS = 900;

interface PromptInputWithUploadProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  inputSize?: "md" | "sm";
  attachedFile: File | null;
  isDragging: boolean;
  fileError: string;
  onRemoveFile: () => void;
  onFileClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const PromptInputWithUpload = ({
  value,
  onChange,
  onKeyDown,
  placeholder,
  inputSize = "md",
  attachedFile,
  isDragging,
  fileError,
  onRemoveFile,
  onFileClick,
  fileInputRef,
  onFileChange,
  disabled = false,
}: PromptInputWithUploadProps) => {
  const { t } = useI18n();

  return (
  <div className="flex w-full flex-col gap-1.5">
    {attachedFile && (
      <div className="flex items-center gap-2 rounded-lg border border-[#d6cfc8] bg-[#f5f0eb] px-2 py-1.5">
        <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-md">
          <Image
            src={URL.createObjectURL(attachedFile)}
            alt={attachedFile.name}
            fill
            className="object-cover"
          />
        </div>
        <span className="flex-1 truncate text-xs text-stone-600">
          {attachedFile.name}
        </span>
        <button
          type="button"
          onClick={onRemoveFile}
          className="text-sm leading-none text-stone-400 transition-colors hover:text-stone-600"
        >
          x
        </button>
      </div>
    )}

    <div
      className={cn(
        "flex w-full items-center overflow-hidden rounded-xl border transition-all",
        isDragging
          ? "border-[#a8896c] ring-2 ring-[#a8896c]/30"
          : "border-[#d6cfc8]",
      )}
    >
      <button
        type="button"
        onClick={disabled ? undefined : onFileClick}
        disabled={disabled}
        className="flex h-full flex-shrink-0 items-center justify-center border-r border-[#d6cfc8] bg-white px-3 transition-colors hover:bg-stone-50"
        style={{ minHeight: inputSize === "md" ? "42px" : "36px" }}
        title={t("aiRecommendation.uploadTitle")}
      >
        <Image
          src="/image_icon.png"
          alt={t("aiRecommendation.uploadAlt")}
          width={18}
          height={18}
          className="h-4.5 w-4.5 object-contain"
        />
      </button>
      <input
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={isDragging ? t("aiRecommendation.dropImage") : placeholder}
        className={cn(
          "min-w-0 flex-1 bg-[#faf7f4] text-stone-800 placeholder:text-stone-400 transition-colors focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400",
          inputSize === "md" ? "px-3 py-2.5 text-sm" : "px-3 py-2 text-xs",
        )}
      />
    </div>

    {fileError && <p className="pl-1 text-[11px] text-red-500">{fileError}</p>}

    <input
      ref={fileInputRef}
      type="file"
      accept="image/png,image/jpeg"
      className="hidden"
      onChange={onFileChange}
      disabled={disabled}
    />
  </div>
  );
};

function buildSessionImages(
  images: GeneratedImageResponse[],
  promptHistory: string[],
  promptTimestamps: string[],
  editCount: number,
): AIGeneratedImage[] {
  const displayPrompt = composeDisplayPromptHistory(promptHistory);

  return images.map((image) => ({
    ...image,
    prompt: displayPrompt,
    promptHistory: [...promptHistory],
    promptTimestamps: [...promptTimestamps],
    editCount,
  }));
}

function formatPromptTime(timestamp?: string) {
  if (!timestamp) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function logSimilarRoomScores(items: Listing[], context: string) {
  console.table(
    items.map((item, index) => ({
      rank: index + 1,
      itemId: item.id,
      similarity: item.embeddingSimilarity ?? null,
      title: item.title,
      address: item.address,
    })),
  );
  console.log(`[find-similar-rooms] ${context}: ${items.length} items`);
}

export function AIRecommendation({
  onSimilarListingsFound,
  allListings,
  similarSearchParams,
  compact = false,
  onPhotoClick,
  canFindSimilarRooms = true,
  onFindSimilarBlocked,
}: AIRecommendationProps) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const updateUser = useAuthStore((state) => state.updateUser);
  const hasHydrated = useAIImageSessionStore((state) => state.hasHydrated);
  const screen = useAIImageSessionStore((state) => state.screen);
  const generatedImages = useAIImageSessionStore((state) => state.generatedImages);
  const imageGroups = useAIImageSessionStore((state) => state.imageGroups);
  const selectedImageId = useAIImageSessionStore((state) => state.selectedImageId);
  const replaceSession = useAIImageSessionStore((state) => state.replaceSession);
  const appendSession = useAIImageSessionStore((state) => state.appendSession);
  const setSelectedImageId = useAIImageSessionStore(
    (state) => state.setSelectedImageId,
  );
  const resetSessionStore = useAIImageSessionStore((state) => state.resetSession);
  const setHasPendingTask = useAIImageSessionStore(
    (state) => state.setHasPendingTask,
  );
  const pendingJob = useAIImageSessionStore((state) => state.pendingJob);
  const setPendingJob = useAIImageSessionStore((state) => state.setPendingJob);
  const clearPendingJob = useAIImageSessionStore((state) => state.clearPendingJob);

  const [prompt, setPrompt] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFindingSimilar, setIsFindingSimilar] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumedJobIdRef = useRef<string | null>(null);
 
  const selectedImage = useMemo(
    () => generatedImages.find((image) => image.id === selectedImageId) ?? null,
    [generatedImages, selectedImageId],
  );
  const isAIInputLocked = !isLoggedIn;
  const promptHistory = generatedImages[0]?.promptHistory ?? [];
  const promptTimestamps = generatedImages[0]?.promptTimestamps ?? [];

  const availableEditCount = Math.max(0, 2 - (selectedImage?.editCount ?? 0));
  const availableCreditsForEdit = Math.max(
    0,
    (user?.remain ?? 0) + (user?.credit ?? 0),
  );
  const remainingEdits = Math.min(availableCreditsForEdit, availableEditCount);
  const hasReachedImageEditLimit = availableEditCount <= 0;

  useEffect(() => {
    setEditPrompt("");
  }, [selectedImageId]);

  useEffect(() => {
    const hasPendingImageTask = isGenerating || isEditing;
    setHasPendingTask(hasPendingImageTask);
    if (!hasPendingImageTask) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setHasPendingTask(false);
    };
  }, [isGenerating, isEditing, setHasPendingTask]);

  const validateAndSetFile = (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFileError("이 파일 형식은 지원하지 않아요.");
      return;
    }

    setFileError("");
    setAttachedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    validateAndSetFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    validateAndSetFile(file);
  };

  const removeFile = () => {
    setAttachedFile(null);
    setFileError("");
  };

  const sharedFileProps = {
    attachedFile,
    isDragging,
    fileError,
    onRemoveFile: removeFile,
    onFileClick: () => fileInputRef.current?.click(),
    fileInputRef,
    onFileChange: handleFileChange,
  };

  const pollGeneratedImageJob = async (
    jobId: string,
    nextPromptHistory: string[],
    nextPromptTimestamps: string[],
    shouldContinue: () => boolean = () => true,
  ) => {
    for (let attempt = 0; attempt < IMAGE_JOB_MAX_ATTEMPTS; attempt += 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, IMAGE_JOB_POLL_INTERVAL_MS),
      );
      if (!shouldContinue()) return null;

      const statusResponse = await fetch(
        `/api/generate-image?jobId=${encodeURIComponent(jobId)}`,
      );

      const data = (await statusResponse.json().catch(() => null)) as {
        status?: string;
        error?: string;
        images?: GeneratedImageResponse[];
      } | null;

      if (!statusResponse.ok) {
        throw new Error(data?.error ?? "이미지 생성 상태 조회에 실패했습니다.");
      }

      if (data?.status === "completed") {
        return buildSessionImages(
          data.images ?? [],
          nextPromptHistory,
          nextPromptTimestamps,
          0,
        );
      }

      if (data?.status === "failed") {
        throw new Error(data.error ?? "이미지 생성에 실패했습니다.");
      }
    }

    throw new Error("이미지 생성 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.");
  };

  const pollEditedImageJob = async (
    jobId: string,
    nextPromptHistory: string[],
    nextPromptTimestamps: string[],
    nextEditCount: number,
    shouldContinue: () => boolean = () => true,
  ) => {
    for (let attempt = 0; attempt < IMAGE_JOB_MAX_ATTEMPTS; attempt += 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, IMAGE_JOB_POLL_INTERVAL_MS),
      );
      if (!shouldContinue()) return null;

      const statusResponse = await fetch(
        `/api/edit-image?jobId=${encodeURIComponent(jobId)}`,
      );

      const data = (await statusResponse.json().catch(() => null)) as {
        status?: string;
        error?: string;
        images?: GeneratedImageResponse[];
        remain?: number;
        credit?: number;
      } | null;

      if (!statusResponse.ok) {
        throw new Error(data?.error ?? "이미지 수정 상태 조회에 실패했습니다.");
      }

      if (data?.status === "completed") {
        return {
          images: buildSessionImages(
            data.images ?? [],
            nextPromptHistory,
            nextPromptTimestamps,
            nextEditCount,
          ),
          remain: data.remain,
          credit: data.credit,
        };
      }

      if (data?.status === "failed") {
        throw new Error(data.error ?? "이미지 수정에 실패했습니다.");
      }
    }

    throw new Error("이미지 수정 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.");
  };

  const requestGeneratedImages = async (
    nextPromptHistory: string[],
    nextPromptTimestamps: string[],
  ) => {
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

    const startData = (await response.json()) as {
      jobId?: string;
      status?: string;
    };

    if (!startData.jobId) {
      throw new Error("이미지 생성 작업을 시작하지 못했습니다.");
    }

    resumedJobIdRef.current = startData.jobId;
    setPendingJob({
      kind: "generate",
      jobId: startData.jobId,
      promptHistory: nextPromptHistory,
      promptTimestamps: nextPromptTimestamps,
    });

    return pollGeneratedImageJob(
      startData.jobId,
      nextPromptHistory,
      nextPromptTimestamps,
    );
  };

  const requestEditedImage = async (
    sourceImageUrl: string,
    userId: number,
    basePrompt: string,
    editRequest: string,
    nextPromptHistory: string[],
    nextPromptTimestamps: string[],
    nextEditCount: number,
  ) => {
    console.log("[AIRecommendation] edit prompt:", editRequest);
    const startResponse = await fetch("/api/edit-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        sourceImageUrl,
        basePrompt,
        editPrompt: editRequest,
        editCount: selectedImage?.editCount ?? 0,
      }),
    });

    if (!startResponse.ok) {
      const errorBody = await startResponse.json().catch(() => null);
      throw new Error(errorBody?.error ?? "이미지 수정에 실패했습니다.");
    }

    const startData = (await startResponse.json()) as {
      jobId?: string;
      status?: string;
      remain?: number;
      credit?: number;
    };

    if (typeof startData.remain === "number" || typeof startData.credit === "number") {
      updateUser({
        remain: typeof startData.remain === "number" ? startData.remain : user?.remain,
        credit: typeof startData.credit === "number" ? startData.credit : user?.credit,
      });
    }

    if (!startData.jobId) {
      throw new Error("이미지 수정 작업을 시작하지 못했습니다.");
    }

    resumedJobIdRef.current = startData.jobId;
    setPendingJob({
      kind: "edit",
      jobId: startData.jobId,
      sourceImageId: selectedImage?.id ?? "",
      promptHistory: nextPromptHistory,
      promptTimestamps: nextPromptTimestamps,
      editCount: nextEditCount,
    });

    return pollEditedImageJob(
      startData.jobId,
      nextPromptHistory,
      nextPromptTimestamps,
      nextEditCount,
    );
  };

  useEffect(() => {
    if (!pendingJob) return;
    if (resumedJobIdRef.current === pendingJob.jobId) return;

    let isActive = true;
    resumedJobIdRef.current = pendingJob.jobId;
    setHasPendingTask(true);

    const resumePendingJob = async (job: AIPendingJob) => {
      try {
        if (job.kind === "generate") {
          setIsGenerating(true);
          setMessage("이미지를 생성하는 중입니다. 잠시만 기다려주세요.");
          setShowGame(true);

          const nextImages = await pollGeneratedImageJob(
            job.jobId,
            job.promptHistory,
            job.promptTimestamps,
            () => isActive,
          );

          if (!isActive || !nextImages) return;
          replaceSession(nextImages);
          removeFile();
          setMessage("");
          toast({ title: "이미지가 생성되었습니다!" });
          clearPendingJob();
          return;
        }

        setIsEditing(true);
        setMessage("이미지를 수정하는 중입니다. 잠시만 기다려주세요.");

        const result = await pollEditedImageJob(
          job.jobId,
          job.promptHistory,
          job.promptTimestamps,
          job.editCount,
          () => isActive,
        );

        if (!isActive || !result) return;
        appendSession(result.images, job.sourceImageId);
        updateUser({
          remain: result.remain ?? user?.remain,
          credit: result.credit ?? user?.credit,
        });
        setEditPrompt("");
        setMessage("");
        toast({ title: "이미지가 수정되었습니다!" });
        clearPendingJob();
      } catch (error) {
        if (!isActive) return;
        console.error("Error resuming image job:", error);
        clearPendingJob();
        setMessage(
          error instanceof Error
            ? error.message
            : "진행 중이던 이미지 작업을 이어가지 못했습니다.",
        );
      } finally {
        if (!isActive) return;
        setIsGenerating(false);
        setIsEditing(false);
        setShowGame(false);
        resumedJobIdRef.current = null;
      }
    };

    resumePendingJob(pendingJob);

    return () => {
      isActive = false;
    };
  }, [
    appendSession,
    clearPendingJob,
    pendingJob,
    replaceSession,
    setHasPendingTask,
    updateUser,
    user?.credit,
    user?.remain,
  ]);

  const handleGenerate = async (overridePrompt?: string) => {
    if (!isLoggedIn) {
      setMessage("로그인 후 AI 이미지를 생성할 수 있습니다.");
      return;
    }

    const activePrompt = (overridePrompt ?? prompt).trim();
    if (!activePrompt || isGenerating) return;

    setIsGenerating(true);
    setMessage("");
    setSelectedImageId(null);
    setShowGame(true);

    try {
      const nextImages = await requestGeneratedImages(
        [activePrompt],
        [new Date().toISOString()],
      );
      if (!nextImages) return;
      replaceSession(nextImages);
      clearPendingJob();
      removeFile();
      toast({ title: "이미지가 생성되었습니다!" });
    } catch (error) {
      console.error("Error generating images:", error);
      clearPendingJob();
      setMessage(
        error instanceof Error
          ? error.message
          : "이미지 생성에 실패했습니다. 다시 시도해주세요.",
      );
    } finally {
      setIsGenerating(false);
      setShowGame(false);
      resumedJobIdRef.current = null;
    }
  };

  const handleSelectImage = (imageId: string) => {
    if (isEditing) return;
    if (!generatedImages.some((image) => image.id === imageId)) return;

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
    if (selectedImage.editCount >= 2) {
      setMessage("이미지 수정은 최대 2번까지 가능합니다.");
      return;
    }

    setIsEditing(true);
    setShowGame(true);  // 추가
    setMessage("이미지를 수정하는 중입니다. 잠시만 기다려주세요.");

    try {
      const nextPromptHistory = [...selectedImage.promptHistory, trimmedEditPrompt];
      const nextPromptTimestamps = [
        ...(selectedImage.promptTimestamps ??
          selectedImage.promptHistory.map(() => new Date().toISOString())),
        new Date().toISOString(),
      ];
      const nextEditCount = selectedImage.editCount + 1;
      const result = await requestEditedImage(
        selectedImage.url,
        user.user_id,
        selectedImage.prompt,
        trimmedEditPrompt,
        nextPromptHistory,
        nextPromptTimestamps,
        nextEditCount,
      );
      if (!result) return;

      appendSession(result.images, selectedImage.id);
      clearPendingJob();
      updateUser({
        remain: result.remain ?? user.remain,
        credit: result.credit ?? user.credit,
      });
      setEditPrompt("");
      setMessage("");
      toast({ title: "이미지가 수정되었습니다!" });
    } catch (error) {
      console.error("Error editing images:", error);
      clearPendingJob();
      setMessage(
        error instanceof Error
          ? error.message
          : "선택한 이미지 수정에 실패했습니다.",
      );
    } finally {
      setIsEditing(false);
      setShowGame(false);  // 추가
    }
  };

  const handleFindSimilar = async () => {
    if (!selectedImage || isFindingSimilar) return;
    if (!canFindSimilarRooms) {
      onFindSimilarBlocked?.();
      return;
    }

    setIsFindingSimilar(true);
    setMessage("");
    const searchImageUrl = selectedImage.url;
    let galleryImageId: number | null = null;

    try {
      if (user?.user_id) {
        const galleryResponse = await fetch("/api/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.user_id,
            image_url: searchImageUrl,
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
        } else {
          const galleryData = await galleryResponse.json().catch(() => null);
          galleryImageId =
            typeof galleryData?.id === "number" ? galleryData.id : null;
        }
      }

      const response = await fetch("/api/find-similar-rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildSearchBody({
            ...(similarSearchParams ?? {}),
            offset: 0,
            limit: 4,
          }),
          image_url: searchImageUrl,
          user_id: user?.user_id ?? null,
          gallery_image_id: galleryImageId,
        }),
      });

      if (!response.ok) {
        throw new Error("유사 매물 검색에 실패했습니다.");
      }

      const data = await response.json();
      if (typeof data.remain === "number" || typeof data.credit === "number") {
        updateUser({
          remain: typeof data.remain === "number" ? data.remain : user?.remain,
          credit: typeof data.credit === "number" ? data.credit : user?.credit,
        });
      }

      if (data.items && data.items.length > 0) {
        const similarItems = data.items.map(mapSimilarItemToListing) as Listing[];
        logSimilarRoomScores(similarItems, "manual search");
        onSimilarListingsFound(similarItems, searchImageUrl);
      } else {
        onSimilarListingsFound(allListings.slice(0, 4));
      }
      handleReset();
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
    setEditPrompt("");
    setMessage("");
    removeFile();
  };

  const handleLoginRedirect = () => {
    router.push(`/${locale}/login`);
  };

  const quickPrompts = [
    t("aiRecommendation.quickDuplex"),
    t("aiRecommendation.quickKitchen"),
    t("aiRecommendation.quickSunlight"),
    t("aiRecommendation.quickMinimal"),
  ];

  const renderImageGroup = (group: AIImageGroup) => {
    const activeGroupId = imageGroups[imageGroups.length - 1]?.id ?? group.id;
    const isActiveGroup = group.id === activeGroupId;
    const promptTime = formatPromptTime(group.timestamp);

    return (
      <div key={group.id} className="flex flex-col gap-2 pb-4">
        <div className="flex justify-end">
          <div className="max-w-[86%] rounded-2xl rounded-br-md bg-stone-700 px-3 py-2 text-white shadow-sm">
            {promptTime && (
              <p className="mb-1 text-[10px] font-semibold text-stone-200">
                {promptTime}
              </p>
            )}
            <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">
              {group.prompt}
            </p>
          </div>
        </div>

        <div className="flex justify-start pl-1">
          <div className="relative w-[92%] rounded-2xl rounded-bl-md border border-[#e8e0d5] bg-white p-2.5 shadow-sm before:absolute before:-left-1 before:top-4 before:h-3 before:w-3 before:rotate-45 before:border-b before:border-l before:border-[#e8e0d5] before:bg-white">
            <div className="grid grid-cols-2 gap-2">
              {group.images.map((image, index) => {
                const isSelected = selectedImage?.id === image.id;
                const isDimmed = selectedImage !== null && !isSelected;
                const isFilteredHistoryImage =
                  !isActiveGroup &&
                  group.selectedImageId !== undefined &&
                  group.selectedImageId !== image.id;

                return (
                  <div
                    key={image.id}
                    onClick={() => isActiveGroup && handleSelectImage(image.id)}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-xl border-2 transition-all duration-150",
                      isActiveGroup ? "cursor-pointer" : "cursor-default",
                      isSelected ? "border-stone-600" : "border-transparent",
                      isDimmed && isActiveGroup && "opacity-30",
                    )}
                  >
                    <Image
                      src={image.url}
                      alt={image.prompt}
                      fill
                      unoptimized
                      className={cn(
                        "object-cover",
                        isFilteredHistoryImage && "grayscale opacity-45",
                      )}
                    />

                    {isSelected && isActiveGroup && (
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

                    {isActiveGroup && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPhotoClick?.(
                            group.images.map((groupImage) => groupImage.url),
                            index,
                          );
                        }}
                        className="absolute left-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg bg-white/80 opacity-0 transition-opacity duration-150 hover:bg-white group-hover:opacity-100"
                      >
                        <Maximize2 className="h-3.5 w-3.5 text-stone-600" />
                      </button>
                    )}

                    <div className="absolute bottom-2 right-2 rounded bg-black/45 px-1.5 py-0.5 text-[10px] text-white">
                      {index + 1}/4
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!hasHydrated) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8 text-xs text-stone-400">
        {t("aiRecommendation.loadingSession")}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="border-t border-border-warm bg-linen p-3 md:p-4">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <span className="shrink-0 text-xs text-neutral-muted md:text-sm">
            {message ||
              (isAIInputLocked
                ? t("aiRecommendation.loginRequiredMessage")
                : t("aiRecommendation.compactGuide"))}
          </span>
          <div className="flex w-full items-start gap-2 sm:flex-1">
            <PromptInputWithUpload
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder={t("aiRecommendation.compactPlaceholder")}
              inputSize="sm"
              disabled={isAIInputLocked}
              {...sharedFileProps}
            />
            <button
              onClick={isAIInputLocked ? handleLoginRedirect : () => handleGenerate()}
              disabled={!isAIInputLocked && (isGenerating || !prompt.trim())}
              className="rounded-lg border border-border-warm bg-linen px-3 py-2 text-xs font-medium text-neutral-dark disabled:cursor-not-allowed disabled:opacity-50 md:px-4 md:text-sm"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isAIInputLocked ? (
                t("aiRecommendation.login")
              ) : (
                t("aiRecommendation.submit")
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden relative">
      {showGame && isGenerating && (
        <HouseCatchGame
          isGenerating={isGenerating}
          onClose={() => setShowGame(false)}
        />
      )}
      {showGame && isEditing && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/10 px-4 backdrop-blur-[1px]">
          <div className="relative w-full max-w-[640px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            <button
              type="button"
              onClick={() => setShowGame(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-md transition hover:bg-white hover:text-stone-950"
              aria-label="이미지 수정 로딩창 닫기"
            >
              <X className="h-5 w-5" />
            </button>
            <Image
              src="/loading-room-finder.png"
              alt="이미지를 수정하는 중입니다."
              width={1024}
              height={576}
              priority
              className="block aspect-video w-full object-cover"
            />
          </div>
        </div>
      )}
      <div style={{ visibility: showGame ? "hidden" : "visible", display: "contents" }}>
      {screen === "init" && (
        <div
          className="flex flex-1 flex-col items-center justify-start gap-4 overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 sm:justify-center sm:gap-5 sm:py-8"
          onDragOver={isAIInputLocked ? undefined : handleDragOver}
          onDragLeave={isAIInputLocked ? undefined : handleDragLeave}
          onDrop={isAIInputLocked ? undefined : handleDrop}
        >
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
              {t("aiRecommendation.title")}
            </p>
            <p className="text-xs leading-relaxed text-stone-500">
              {t("aiRecommendation.descriptionLine1")}
              <br />
              {t("aiRecommendation.descriptionLine2")}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2">
            <PromptInputWithUpload
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder={t("aiRecommendation.initialPlaceholder")}
              inputSize="md"
              disabled={isAIInputLocked}
              {...sharedFileProps}
            />
            <button
              onClick={isAIInputLocked ? handleLoginRedirect : () => handleGenerate()}
              disabled={!isAIInputLocked && (isGenerating || !prompt.trim())}
              className="w-full rounded-xl bg-stone-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : isAIInputLocked ? (
                t("aiRecommendation.loginAndGenerate")
              ) : (
                t("aiRecommendation.generate")
              )}
            </button>
          </div>

          {!isAIInputLocked && (
            <div className="grid w-full grid-cols-2 gap-2">
              {quickPrompts.map((quickPrompt) => (
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
          )}

          {message && <p className="text-center text-xs text-red-500">{message}</p>}
        </div>
      )}

      {screen === "generated" && (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(imageGroups.length > 0
              ? imageGroups
              : generatedImages.length > 0
                ? [
                    {
                      id: "legacy-generated-images",
                      prompt: promptHistory[promptHistory.length - 1] ?? "",
                      timestamp: promptTimestamps[promptTimestamps.length - 1],
                      images: generatedImages,
                    },
                  ]
                : []
            ).map(renderImageGroup)}
          </div>

          {!selectedImage && (
            <div className="shrink-0 border-t border-[#e8e0d5] px-3 py-3">
              <p className="mb-2 text-center text-xs text-stone-500">
                {t("aiRecommendation.selectImage")}
              </p>

              <button
                onClick={handleReset}
                disabled={isGenerating || isEditing || isFindingSimilar}
                className="cursor-pointer mt-2 block w-full rounded-xl border border-[#d6cfc8] bg-white py-2.5 text-center text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("aiRecommendation.newImage")}
              </button>
            </div>
          )}

          {selectedImage && (
            <div className="shrink-0 border-t border-[#e8e0d5] px-3 py-3 flex flex-col gap-2">
              <div className="rounded-xl border border-[#e8e0d5] bg-[#faf7f4] p-2.5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold leading-relaxed text-stone-700">
                      {t("aiRecommendation.editGuide")}
                    </p>
                    <p className="mt-1 text-[10px] text-stone-400">
                      {t("aiRecommendation.remainingEdits", { count: remainingEdits })}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={() => setSelectedImageId(null)}
                      disabled={isEditing}
                      className="mt-0.5 shrink-0 text-sm leading-none text-stone-400 transition-colors hover:text-stone-600 disabled:cursor-not-allowed disabled:opacity-40"
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
                      remainingEdits > 0 && !hasReachedImageEditLimit
                        ? t("aiRecommendation.editPlaceholder")
                        : hasReachedImageEditLimit
                          ? t("aiRecommendation.editLimit")
                          : t("aiRecommendation.noEditsLeft")
                    }
                    disabled={remainingEdits === 0 || hasReachedImageEditLimit}
                    className="flex-1 rounded-lg border border-[#d6cfc8] bg-white px-3 py-2 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400/40 disabled:cursor-not-allowed disabled:bg-stone-100"
                  />
                  <button
                    onClick={handleEdit}
                    disabled={
                      isEditing ||
                      !editPrompt.trim() ||
                      remainingEdits === 0 ||
                      hasReachedImageEditLimit
                    }
                    className="whitespace-nowrap rounded-lg bg-stone-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isEditing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      t("aiRecommendation.edit")
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-[#e8e0d5]" />
                <span className="text-[10px] text-stone-400">
                  {t("aiRecommendation.ifLikeImage")}
                </span>
                <div className="h-px flex-1 bg-[#e8e0d5]" />
              </div>

              <button
                onClick={handleFindSimilar}
                disabled={isFindingSimilar || isEditing}
                className="w-full rounded-xl bg-stone-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isFindingSimilar || isEditing ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  t("aiRecommendation.findSimilar")
                )}
              </button>

              {message && <p className="text-center text-xs text-red-500">{message}</p>}

              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-[#e8e0d5]" />
                <span className="text-[10px] text-stone-400">
                  {t("aiRecommendation.or")}
                </span>
                <div className="h-px flex-1 bg-[#e8e0d5]" />
              </div>

              <button
                onClick={handleReset}
                disabled={isGenerating || isEditing || isFindingSimilar}
                className="w-full rounded-xl border border-[#d6cfc8] bg-white py-2.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("aiRecommendation.newImage")}
              </button>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
