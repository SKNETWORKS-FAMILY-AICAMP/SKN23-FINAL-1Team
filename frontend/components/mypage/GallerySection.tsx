"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Loader2, Trash2, Maximize2, ImageIcon, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface GalleryImage {
  id: number;
  image_url: string;
  prompt: string | null;
  created_at: string;
}

interface GallerySectionProps {
  userId: number;
}

function getGalleryImageSrc(imageUrl: string) {
  if (imageUrl.startsWith("/api/images/")) {
    return `/backend${imageUrl}`;
  }
  return imageUrl;
}

export function GallerySection({ userId }: GallerySectionProps) {
  const router = useRouter();
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadGallery = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await fetch(`/api/gallery?user_id=${userId}`);
      if (!r.ok) return;
      const data = await r.json();
      setGalleryImages(data.items);
    } catch (error) {
      console.error("갤러리 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const handleDelete = async (id: number) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const r = await fetch(`/api/gallery/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      setGalleryImages((prev) => prev.filter((img) => img.id !== id));
      if (selectedImage?.id === id) setSelectedImage(null);
    } catch (error) {
      console.error("갤러리 삭제 실패:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFindSimilar = (imageUrl: string) => {
    // TODO: pendingGalleryImage store 연결 (임베딩 기능 완성 후)
    router.push("/home");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400 md:mb-4">
        AI 생성 이미지 갤러리
      </p>

      {galleryImages.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-stone-200 bg-white/80 px-4 py-10 text-center text-sm font-medium text-stone-500">
          저장된 AI 이미지가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {galleryImages.map((item) => (
            <div
              key={item.id}
              className="group relative w-full overflow-hidden rounded-2xl border border-stone-200/80"
              style={{ height: "320px" }}
            >
              <Image
                src={getGalleryImageSrc(item.image_url)}
                alt={item.prompt ?? "AI 생성 이미지"}
                fill
                unoptimized
                className="object-cover"
              />

              {/* 호버 오버레이 — pointer-events-none으로 버튼 클릭 방해 안 함 */}
              <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100 pointer-events-none" />

              {/* 우측 상단 확대/삭제 버튼 */}
              <div className="absolute right-2 top-2 z-20 flex gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <button
                  onClick={() => setSelectedImage(item)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 transition-colors hover:bg-white"
                  title="확대"
                >
                  <Maximize2 className="h-3.5 w-3.5 text-stone-600" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/90 transition-colors hover:bg-red-500"
                  title="삭제"
                >
                  {deletingId === item.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 text-white" />
                  )}
                </button>
              </div>

              {/* 가운데 유사 매물 찾기 버튼 */}
              <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 pointer-events-none">
                <button
                  onClick={() => handleFindSimilar(item.image_url)}
                  className="rounded-full bg-[#5C8A62] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#4a7050] pointer-events-auto"
                >
                  유사 매물 찾기 →
                </button>
              </div>

              {/* 하단 프롬프트 */}
              {item.prompt && (
                <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/40 px-2 py-1 pointer-events-none">
                  <p className="truncate text-[10px] text-white">{item.prompt}</p>
                </div>
              )}
            </div>
          ))}

          {/* 새 검색 버튼 */}
          <div
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-stone-200 bg-white/80 transition-colors hover:bg-stone-50"
            style={{ height: "320px" }}
            onClick={() => router.push("/home")}
          >
            <ImageIcon className="h-5 w-5 text-stone-300" />
            <span className="text-xs font-medium text-stone-400">새 검색</span>
          </div>
        </div>
      )}

      {/* 확대 모달 */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="w-[420px] max-w-[90vw] overflow-hidden rounded-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-square w-full">
              <Image
                src={getGalleryImageSrc(selectedImage.image_url)}
                alt={selectedImage.prompt ?? "AI 생성 이미지"}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <div className="p-4 pb-5">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-semibold text-stone-800">
                  {selectedImage.prompt ?? "AI 생성 이미지"}
                </p>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-4 text-xs text-stone-400">
                {new Date(selectedImage.created_at).toLocaleDateString("ko-KR")}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFindSimilar(selectedImage.image_url)}
                  className="flex-1 rounded-xl bg-[#5C8A62] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4a7050]"
                >
                  이 이미지로 유사 매물 찾기 →
                </button>
                <button
                  onClick={() => handleDelete(selectedImage.id)}
                  disabled={deletingId === selectedImage.id}
                  className="flex items-center justify-center rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100"
                >
                  {deletingId === selectedImage.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
