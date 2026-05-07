"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, CheckCircle } from "lucide-react";
import { useRegisterStore } from "@/store/registerStore";
import { useAuthStore } from "@/store/authStore";

export default function RegisterPhotoPage() {
  const router = useRouter();
  const form = useRegisterStore((state) => state.form);
  const clearForm = useRegisterStore((state) => state.clearForm);
  const user = useAuthStore((state) => state.user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [registeredItemId, setRegisteredItemId] = useState<number | null>(null);

  const addPhotos = useCallback((files: FileList | null) => {
    if (!files) return;
    const newPhotos = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 10 - photos.length)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 10));
  }, [photos.length]);

  const removePhoto = (idx: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addPhotos(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (!form) {
      setError("매물 정보가 없습니다. 다시 시도해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. 매물 먼저 등록 → item_id 받아오기
      const registerRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, image_thumbnail: null, image_urls: [] }),
      });

      if (!registerRes.ok) {
        const err = await registerRes.json();
        setError(err.detail ?? "등록에 실패했습니다.");
        return;
      }

      const { item_id } = await registerRes.json();

      // 2. item_id로 사진 S3 업로드
      const uploadedUrls: string[] = [];
      for (let idx = 0; idx < photos.length; idx++) {
        const photo = photos[idx];
        const formData = new FormData();
        formData.append("file", photo.file);
        formData.append("item_id", String(item_id));
        formData.append("index", String(idx));

        const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms/upload-image`, {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedUrls.push(uploadData.url);
        }
      }

      // 3. 업로드된 이미지 URL 매물에 업데이트
      if (uploadedUrls.length > 0) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms/update-images`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_id,
            image_thumbnail: uploadedUrls[0],
            image_urls: uploadedUrls,
          }),
        });
      }

      setRegisteredItemId(item_id);
      setIsDone(true);
      clearForm();
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 완료 화면
  if (isDone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,244,238,0.94)_100%)]">
        <div className="flex flex-col items-center gap-6 rounded-[24px] border border-stone-200/80 bg-white/80 p-10 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-stone-900">매물이 등록되었습니다!</p>
            <p className="mt-1 text-sm text-stone-400">매물번호 {registeredItemId}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/mypage")}
              className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              매물 관리
            </button>
            <button
              onClick={() => router.push("/home")}
              className="rounded-xl bg-stone-800 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              메인으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,244,238,0.94)_100%)]">
      <div className="mx-auto max-w-lg px-4 py-8">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-800"
        >
          ← 이전
        </button>

        <p className="mb-6 text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400">
          사진 업로드
        </p>

        <div className="rounded-[20px] border border-stone-200/80 bg-white/80 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          {/* 드래그 존 */}
          <div
            ref={fileInputRef as any}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mb-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors ${
              isDragging ? "border-stone-400 bg-stone-50" : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
            }`}
          >
            <Plus className="h-6 w-6 text-stone-400" />
            <p className="text-sm font-medium text-stone-600">클릭하거나 사진을 드래그하세요</p>
            <p className="text-xs text-stone-400">최대 10장 · JPG, PNG, WEBP</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addPhotos(e.target.files)}
          />

          {/* 사진 미리보기 */}
          {photos.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative h-20 w-20 overflow-hidden rounded-xl border border-stone-200">
                    {idx === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-stone-800/70 px-1 py-0.5 text-[9px] font-bold text-white">
                        대표
                      </span>
                    )}
                    <img src={photo.preview} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => removePhoto(idx)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 10 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-20 w-20 flex-shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-200 hover:border-stone-300"
                  >
                    <Plus className="h-5 w-5 text-stone-400" />
                    <span className="text-[11px] text-stone-400">추가</span>
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-stone-400">{photos.length}/10장 · 첫번째 사진이 대표 이미지예요</p>
            </div>
          )}

          {error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full cursor-pointer rounded-2xl bg-[#A8896C] py-4 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "등록 중..." : "매물 등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}