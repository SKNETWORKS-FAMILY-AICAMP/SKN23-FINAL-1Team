"use client";

import Image from "next/image";
import type { KeyboardEvent } from "react";
import type { Listing } from "@/components/room-finder/map-view";
import { FavoriteButton } from "@/components/common/Button";
import { cn } from "@/lib/utils";

interface ListingCardProps {
  listing: Listing;
  isSelected?: boolean;
  onClick?: (listing: Listing) => void;
  onImageClick?: (listing: Listing) => void;
  isFavorite?: boolean;
  isFavoriteLoading?: boolean;
  onToggleFavorite?: () => void;
}

export function isValidImageSrc(value?: string | null) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (["", "nan", "none", "null"].includes(normalized)) return false;
  return (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("/")
  );
}

export function ListingCard({
  listing,
  isSelected = false,
  onClick,
  onImageClick,
  isFavorite = false,
  isFavoriteLoading = false,
  onToggleFavorite,
}: ListingCardProps) {
  const imageSrc = isValidImageSrc(listing.images?.[0])
    ? listing.images[0]
    : null;

  const handleSelect = () => onClick?.(listing);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onClick || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    handleSelect();
  };

  return (
    <article
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={cn("w-full text-left", onClick && "cursor-pointer")}
      aria-label={onClick ? `${listing.title} 상세 보기` : undefined}
    >
      <div
        className={cn(
          "group flex items-center gap-3 rounded-2xl border p-3 transition-all duration-200 bg-white",
          isSelected
            ? "border-amber-200 shadow-[0_4px_16px_rgba(245,158,11,0.14)] ring-1 ring-amber-100"
            : "border-stone-200/80 hover:border-stone-300 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]",
        )}
      >
        {/* 썸네일 */}
        <div
          className="relative h-[90px] w-[90px] flex-shrink-0 overflow-hidden rounded-xl bg-stone-100 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onImageClick?.(listing);
          }}
        >
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={listing.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="90px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-stone-400">
              없음
            </div>
          )}
          <div className="absolute left-1.5 top-1.5 z-10 rounded-md bg-black/50 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm">
            {listing.structure || "매물"}
          </div>
        </div>

        {/* 텍스트 */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-snug text-stone-800">
            {listing.title}
          </p>
          <p className="mt-1 text-[15px] font-semibold text-stone-900">
            {listing.price}
          </p>
          <p className="mt-1 truncate text-[11px] text-stone-400">
            {listing.address}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-400">
            {[listing.size, listing.floor ? `${listing.floor}층` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        {/* 하트 버튼 */}
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <FavoriteButton
            isFavorite={!!isFavorite}
            disabled={!!isFavoriteLoading}
            onClick={() => onToggleFavorite?.()}
            className="h-8 w-8 border-stone-200 bg-stone-50 shadow-none hover:bg-stone-100"
          />
        </div>
      </div>
    </article>
  );
}
