"use client";

import { useEffect, useRef, useState } from "react";
import type { Listing } from "@/components/room-finder/map-view";
import { ListingCard } from "@/components/common/ListingCards";
import { AIRecommendation } from "@/components/room-finder/ai-recommendation";
import { Sparkles, House, Heart, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecentStore } from "@/store/recentStore";

interface ListingPanelProps {
  listings: Listing[];
  selectedListing?: Listing | null;
  onListingClick?: (listing: Listing) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  scrollResetKey?: number;
  onSimilarListingsFound?: (listings: Listing[]) => void;
  favoriteIds: number[];
  favoriteLoadingIds: number[];
  onToggleFavorite: (listingId: number) => void;
  favoriteListings?: Listing[];
  isLoggedIn?: boolean;
  onWishClick?: (listing: Listing) => void;
  sort?: "latest" | "price_asc" | "price_desc";
  onSortChange?: (sort: "latest" | "price_asc" | "price_desc") => void;
}

type PanelTab = "list" | "ai" | "wish";

export function ListingPanel({
  listings,
  selectedListing,
  onListingClick,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  scrollResetKey = 0,
  onSimilarListingsFound,
  favoriteIds,
  favoriteLoadingIds,
  onToggleFavorite,
  favoriteListings = [],
  isLoggedIn = false,
  onWishClick,
  sort = "latest",
  onSortChange,
}: ListingPanelProps) {
  const addRecent = useRecentStore((state) => state.addRecent);

  const handleListingClick = (listing: Listing) => {
    addRecent({
      id: listing.id,
      title: listing.title,
      price: listing.price,
      address: listing.address,
      images: listing.images,
      structure: listing.structure,
      size: listing.size,
      floor: listing.floor,
      lat: listing.lat,
      lng: listing.lng,
    });
    onListingClick?.(listing);
  };

  const handleWishClick = (listing: Listing) => {
    addRecent({
      id: listing.id,
      title: listing.title,
      price: listing.price,
      address: listing.address,
      images: listing.images,
      structure: listing.structure,
      size: listing.size,
      floor: listing.floor,
      lat: listing.lat,
      lng: listing.lng,
    });
    (onWishClick ?? onListingClick)?.(listing);
  };

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

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white md:bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(245,242,236,0.92)_100%)]">
      <div className="border-b border-stone-200/80 bg-white/70 px-5 pb-2 pt-0 backdrop-blur-md shrink-0">
        <div
          className={cn(
            "rounded-2xl border border-stone-200/80 bg-stone-100/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
            isLoggedIn ? "grid grid-cols-3" : "grid grid-cols-2",
          )}
        >
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

        {currentTab === "list" && onSortChange && (
          <div className="flex items-center justify-end gap-3 pt-2 pr-3">
            <button
              onClick={() => onSortChange("latest")}
              className={cn(
                "text-xs tracking-tight transition-colors duration-200",
                sort === "latest" ? "font-semibold text-stone-900" : "text-stone-400 hover:text-stone-600"
              )}
            >
              등록순
            </button>
            <button
              onClick={() => onSortChange(
                sort === "latest" ? "price_desc" :
                sort === "price_desc" ? "price_asc" : "latest"
              )}
              className={cn(
                "text-xs tracking-tight transition-colors duration-200",
                sort !== "latest" ? "font-semibold text-stone-900" : "text-stone-400 hover:text-stone-600"
              )}
            >
              {sort === "price_desc" ? "높은 가격순" : sort === "price_asc" ? "낮은 가격순" : "가격순"}
            </button>
            <div className="relative group">
              <span className="text-[10px] text-stone-400 border border-stone-300 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center cursor-default">i</span>
              <div className="absolute bottom-5 right-0 bg-stone-800 text-white text-[11px] px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                보증금 + 월세 × 100 기준
              </div>
            </div>
            <button
              onClick={() => onSortChange("latest")}
              className="text-stone-400 hover:text-stone-600 transition-colors duration-200"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
        {activeTab === "list" && (
          <div ref={scrollContainerRef} className="h-full overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {listings.map((listing) => (
                <div key={listing.id} className="cursor-pointer transition-transform duration-200">
                  <ListingCard
                    listing={listing}
                    isSelected={selectedListing?.id === listing.id}
                    onClick={handleListingClick}
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

        <div className={cn(
          "flex-1 min-h-0 flex flex-col overflow-hidden",
          activeTab === "ai" ? "flex" : "hidden"
        )}>
          <AIRecommendation
            allListings={listings}
            onSimilarListingsFound={(similarListings) => {
              onSimilarListingsFound?.(similarListings);
              setActiveTab("list");
            }}
          />
        </div>

        {activeTab === "wish" && isLoggedIn && (
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
                      onClick={handleWishClick}
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
