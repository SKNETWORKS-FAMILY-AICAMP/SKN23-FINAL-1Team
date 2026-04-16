"use client";

import Image from "next/image";
import type { KeyboardEvent } from "react";
import type { Listing } from "@/components/room-finder/map-view";
import { FavoriteButton } from "@/components/common/Button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Ruler, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListingCardProps {
  listing: Listing;
  isSelected?: boolean;
  onClick?: (listing: Listing) => void;
  isFavorite?: boolean;
  isFavoriteLoading?: boolean;
  onToggleFavorite?: () => void;
}

export function isValidImageSrc(value?: string | null) {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();

  if (["", "nan", "none", "null"].includes(normalized)) {
    return false;
  }

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
  isFavorite = false,
  isFavoriteLoading = false,
  onToggleFavorite,
}: ListingCardProps) {
  const imageSrc = isValidImageSrc(listing.images?.[0])
    ? listing.images[0]
    : null;

  const handleSelect = () => {
    onClick?.(listing);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onClick || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

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
      <Card
        className={cn(
          "group gap-0 overflow-hidden rounded-[26px] border py-0 shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition-all duration-300",
          "bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,246,241,0.92)_100%)]",
          isSelected
            ? "border-amber-200 shadow-[0_18px_40px_rgba(245,158,11,0.14)] ring-1 ring-amber-100"
            : "border-stone-200/80 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]",
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
          {imageSrc ? (
            <>
              <Image
                src={imageSrc}
                alt={listing.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(min-width: 1280px) 380px, (min-width: 768px) 50vw, 100vw"
              />
              <div className="absolute right-3 top-3 z-10">
                <FavoriteButton
                  isFavorite={!!isFavorite}
                  disabled={!!isFavoriteLoading}
                  onClick={() => onToggleFavorite?.()}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-black/0 to-transparent" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-medium text-stone-400">
              이미지 없음
            </div>
          )}

          <div className="absolute left-4 top-4 rounded-full bg-white/88 px-3 py-1 text-xs font-semibold tracking-tight text-stone-700 shadow-sm backdrop-blur-sm">
            {listing.structure || "매물"}
          </div>
        </div>

        <CardContent className="space-y-4 p-5">
          <div className="space-y-1.5">
            <p className="line-clamp-1 text-xl font-bold leading-7 tracking-tight text-stone-900">
              {listing.title}
            </p>
            <p className="text-[22px] font-extrabold tracking-tight text-stone-900">
              {listing.price}
            </p>
          </div>

          <div className="space-y-2 text-sm text-stone-500">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
              <span className="line-clamp-2 leading-5">{listing.address}</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="inline-flex items-center gap-1.5">
                <Ruler className="h-4 w-4 text-stone-400" />
                <span>{listing.size}</span>
              </div>
              <div className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-stone-400" />
                <span>{listing.floor}층</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </article>
  );
}
