"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Listing } from "@/components/room-finder/map-view";
import { ListingCard } from "@/components/common/ListingCards";
import { AIRecommendation } from "@/components/room-finder/ai-recommendation";
import { Sparkles, House, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListingPanelProps {
  listings: Listing[];
  selectedListing?: Listing | null;
  onListingClick?: (listing: Listing) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  onSimilarListingsFound?: (listings: Listing[]) => void;
  favoriteIds: number[];
  favoriteLoadingIds: number[];
  onToggleFavorite: (listingId: number) => void;
  favoriteListings?: Listing[];
  isLoggedIn?: boolean;
  scrollResetKey?: number;
}

type PanelTab = "list" | "ai" | "wish";

export function ListingPanel({
  listings,
  selectedListing,
  onListingClick,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  onSimilarListingsFound,
  favoriteIds,
  favoriteLoadingIds,
  onToggleFavorite,
  favoriteListings = [],
  isLoggedIn = false,
  scrollResetKey,
}: ListingPanelProps) {
  const observerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<PanelTab>("list");
  const currentTab = !isLoggedIn && activeTab === "wish" ? "list" : activeTab;

  useEffect(() => {
    if (currentTab !== "list") return;
    if (!observerRef.current || !scrollContainerRef.current) return;
    if (!onLoadMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !isLoading) {
          onLoadMore();
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "200px",
        threshold: 0,
      },
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [currentTab, hasMore, isLoading, onLoadMore]);

  useEffect(() => {
    if (currentTab !== "list") return;
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [currentTab, scrollResetKey]);

  const headerTitle = useMemo(() => {
    if (currentTab === "list") return "매물 목록";
    if (currentTab === "ai") return "AI 추천";
    return "찜 목록";
  }, [currentTab]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white md:bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(245,242,236,0.92)_100%)]">
      <div className="border-b border-stone-200/80 bg-white/70 px-5 pb-4 pt-6 backdrop-blur-md shrink-0">
        <div className="mb-4">

          <div className="mt-1 text-xl font-bold tracking-tight text-stone-900">
            {headerTitle}
          </div>
        </div>

        <div className={cn(
          "rounded-2xl border border-stone-200/80 bg-stone-100/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
          isLoggedIn ? "grid grid-cols-3" : "grid grid-cols-2"
        )}>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200",
              currentTab === "list"
                ? "bg-white text-stone-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                : "text-stone-500 hover:text-stone-800",
            )}
          >
            <House className="h-4 w-4" />
            매물목록
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200",
              currentTab === "ai"
                ? "bg-white text-stone-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                : "text-stone-500 hover:text-stone-800",
            )}
          >
            <Sparkles className="h-4 w-4" />
            AI추천
          </button>

          {isLoggedIn && (
            <button
              type="button"
              onClick={() => setActiveTab("wish")}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200",
                  currentTab === "wish"
                  ? "bg-white text-stone-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                  : "text-stone-500 hover:text-stone-800",
              )}
            >
              <Heart className="h-4 w-4" />
              찜목록
              {favoriteListings.length > 0 && (
                <span className="ml-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">
                  {favoriteListings.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {currentTab === "list" && (
          <div
            ref={scrollContainerRef}
            className="h-full overflow-y-auto px-4 py-4"
          >
            <div className="space-y-4">
              {listings.map((listing) => (
                <div key={listing.id} className="cursor-pointer transition-transform duration-200">
                  <ListingCard
                    listing={listing}
                    isSelected={selectedListing?.id === listing.id}
                    onClick={onListingClick}
                    isFavorite={favoriteIds.includes(Number(listing.id))}
                    isFavoriteLoading={favoriteLoadingIds.includes(Number(listing.id))}
                    onToggleFavorite={() => onToggleFavorite(Number(listing.id))}
                  />
                </div>
              ))}
            </div>
            <div ref={observerRef} className="h-10" />
            {isLoading && (
              <div className="py-6 text-center text-sm font-medium text-stone-500">
                더 불러오는 중...
              </div>
            )}
            {!hasMore && listings.length > 0 && (
              <div className="py-6 text-center text-sm font-medium text-stone-400">
                마지막 매물입니다.
              </div>
            )}
            {!isLoading && listings.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-stone-200 bg-white/80 px-4 py-10 text-center text-sm font-medium text-stone-500 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                표시할 매물이 없습니다.
              </div>
            )}
          </div>
        )}

        {currentTab === "ai" && (
          <AIRecommendation
            allListings={listings}
            onSimilarListingsFound={(similarListings) => {
              onSimilarListingsFound?.(similarListings);
              setActiveTab("list");
            }}
          />
        </div>

        {currentTab === "wish" && isLoggedIn && (
          <div className="h-full overflow-y-auto px-4 py-4">
            {favoriteListings.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-stone-200 bg-white/80 px-4 py-10 text-center text-sm font-medium text-stone-500 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                찜한 매물이 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {favoriteListings.map((listing) => (
                  <div key={listing.id} className="cursor-pointer transition-transform duration-200">
                    <ListingCard
                      listing={listing}
                      isSelected={selectedListing?.id === listing.id}
                      onClick={onListingClick}
                      isFavorite={true}
                      isFavoriteLoading={favoriteLoadingIds.includes(Number(listing.id))}
                      onToggleFavorite={() => onToggleFavorite(Number(listing.id))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
