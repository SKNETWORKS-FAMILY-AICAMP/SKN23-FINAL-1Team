"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export default function button() {
  return (
    <>
      <h1>button Component</h1>
    </>
  );
}

interface FavoriteButtonProps {
  isFavorite: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function FavoriteButton({
  isFavorite,
  onClick,
  disabled = false,
  className,
}: FavoriteButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      className={cn(
        "inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/70 bg-white/90 shadow-md backdrop-blur transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition",
          isFavorite ? "fill-rose-500 text-rose-500" : "text-stone-700",
        )}
      />
    </button>
  );
}
