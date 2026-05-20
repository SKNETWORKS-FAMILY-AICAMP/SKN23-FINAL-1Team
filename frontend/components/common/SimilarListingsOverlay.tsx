"use client";

import Image from "next/image";
import { X } from "lucide-react";
import type { Listing } from "@/components/room-finder/map-view";

interface SimilarListingsOverlayProps {
  listings: Listing[];
  isPanelOpen: boolean;
  onClose: () => void;
  onListingClick: (listing: Listing) => void;
}

export function SimilarListingsOverlay({
  listings,
  isPanelOpen,
  onClose,
  onListingClick,
}: SimilarListingsOverlayProps) {
  if (listings.length === 0) return null;

  return (
    <section
      className={`absolute top-16 z-20 w-[360px] max-w-[calc(100vw-520px)] rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-[0_32px_90px_rgba(15,23,42,0.34),0_12px_32px_rgba(15,23,42,0.22)] backdrop-blur-md transition-all duration-300 ${
        isPanelOpen ? "right-[420px] xl:right-[470px]" : "right-16"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-stone-900">
            이 사진과 비슷한 매물
          </p>
          <p className="text-xs text-stone-500">
            현재 매물은 제외하고 추천했어요
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
          aria-label="사진 유사 매물 닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        {listings.map((listing, index) => {
          const imageSrc = listing.images?.[0];

          return (
            <button
              key={`photo-similar-${listing.id}`}
              type="button"
              onClick={() => onListingClick(listing)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-stone-200 bg-white p-2 text-left transition-all duration-200 hover:border-stone-300 hover:shadow-md"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt={listing.title}
                    fill
                    unoptimized
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-stone-400">
                    No Image
                  </div>
                )}
                <div className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-[10px] font-bold text-white">
                  {index + 1}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-stone-800">
                  {listing.title}
                </p>
                <p className="mt-1 text-sm font-bold text-stone-950">
                  {listing.price}
                </p>
                <p className="mt-1 truncate text-[11px] text-stone-500">
                  {listing.address}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
