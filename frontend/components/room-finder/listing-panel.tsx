"use client";

import { useEffect, useRef, useState } from "react";
import type { Listing } from "@/components/room-finder/map-view";
import { ListingCard } from "@/components/common/ListingCards";
import { AIRecommendation } from "@/components/room-finder/ai-recommendation";
import { Sparkles, House, Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecentStore } from "@/store/recentStore";
import type { RoomSearchParams } from "@/lib/api/rooms";
import { useI18n } from "@/lib/i18n";

interface ListingPanelProps {
  listings: Listing[];
  selectedListing?: Listing | null;
  onListingClick?: (listing: Listing) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  scrollResetKey?: number;
  onSimilarListingsFound?: (listings: Listing[], imageUrl?: string) => void;
  aiRecommendedListings?: Listing[];
  favoriteIds: number[];
  favoriteLoadingIds: number[];
  onToggleFavorite: (listingId: number) => void;
  favoriteListings?: Listing[];
  onWishTabOpen?: () => void;
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
  onWishClick?: (listing: Listing) => void;
  sort?: "latest" | "price_asc" | "price_desc" | "recommended";
  onSortChange?: (sort: "latest" | "price_asc" | "price_desc" | "recommended") => void;
  onAIPhotoClick?: (images: string[], index: number) => void;
  similarSearchParams?: RoomSearchParams;
  canFindSimilarRooms?: boolean;
  onFindSimilarBlocked?: () => void;
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
  aiRecommendedListings = [],
  favoriteIds,
  favoriteLoadingIds,
  onToggleFavorite,
  favoriteListings = [],
  onWishTabOpen,
  isLoggedIn = false,
  onLoginRequired,
  onWishClick,
  sort = "latest",
  onSortChange,
  onAIPhotoClick,
  similarSearchParams,
  canFindSimilarRooms = true,
  onFindSimilarBlocked,
}: ListingPanelProps) {
  const { t } = useI18n();
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

  const topAiRecommendedListings = aiRecommendedListings.slice(0, 4);

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

  useEffect(() => {
    if (currentTab !== "wish") return;
    onWishTabOpen?.();
  }, [currentTab, onWishTabOpen]);

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden bg-white md:bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(245,242,236,0.92)_100%)]">
      <div className="relative z-10 shrink-0 border-b border-stone-200/80 bg-white/70 px-3 pb-2 pt-3 backdrop-blur-md sm:px-5">
        <div
          className={cn(
            "grid min-w-0 gap-1 rounded-2xl border border-stone-200/80 bg-stone-100/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
            isLoggedIn ? "grid grid-cols-3" : "grid grid-cols-2",
          )}
        >
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={cn(
              "inline-flex min-w-0 cursor-pointer items-center justify-center gap-1 rounded-xl px-1.5 py-2.5 text-xs font-semibold tracking-tight transition-all duration-200 sm:gap-1.5 sm:px-2 sm:text-sm",
              currentTab === "list"
                ? "bg-white text-stone-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                : "text-stone-500 hover:text-stone-800",
            )}
          >
            <House className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{t("listingPanel.listTab")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={cn(
              "inline-flex min-w-0 cursor-pointer items-center justify-center gap-1 rounded-xl px-1.5 py-2.5 text-xs font-semibold tracking-tight transition-all duration-200 sm:gap-1.5 sm:px-2 sm:text-sm",
              currentTab === "ai"
                ? "bg-white text-stone-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                : "text-stone-500 hover:text-stone-800",
            )}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{t("listingPanel.aiTab")}</span>
          </button>

          {isLoggedIn && (
            <button
              type="button"
              onClick={() => setActiveTab("wish")}
              className={cn(
                "inline-flex min-w-0 cursor-pointer items-center justify-center gap-1 rounded-xl px-1.5 py-2.5 text-xs font-semibold tracking-tight transition-all duration-200 sm:gap-1.5 sm:px-2 sm:text-sm",
                currentTab === "wish"
                  ? "bg-white text-stone-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                  : "text-stone-500 hover:text-stone-800",
              )}
            >
              <Heart className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{t("listingPanel.wishTab")}</span>
              {favoriteListings.length > 0 && (
                <span className="ml-0.5 shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">
                  {favoriteListings.length}
                </span>
              )}
            </button>
          )}
        </div>

        {currentTab === "list" && onSortChange && (
          <div className="flex items-center justify-start gap-3 overflow-x-auto pt-2 pr-1 scrollbar-hide sm:justify-end sm:pr-3">
            <button
              onClick={() => onSortChange("recommended")}
              className={cn(
                "cursor-pointer text-xs tracking-tight transition-colors duration-200",
                sort === "recommended" ? "font-semibold text-stone-900" : "text-stone-400 hover:text-stone-600"
              )}
            >
              {t("listingPanel.recommendedSort")}
            </button>
            <button
              onClick={() => onSortChange("latest")}
              className={cn(
                "cursor-pointer text-xs tracking-tight transition-colors duration-200",
                sort === "latest" ? "font-semibold text-stone-900" : "text-stone-400 hover:text-stone-600"
              )}
            >
              {t("listingPanel.latestSort")}
            </button>
            <button
              onClick={() => onSortChange("price_asc")}
              className={cn(
                "cursor-pointer text-xs tracking-tight transition-colors duration-200",
                sort === "price_asc" ? "font-semibold text-stone-900" : "text-stone-400 hover:text-stone-600"
              )}
            >
              {t("listingPanel.priceAscSort")}
            </button>
            <button
              onClick={() => onSortChange("price_desc")}
              className={cn(
                "cursor-pointer text-xs tracking-tight transition-colors duration-200",
                sort === "price_desc" ? "font-semibold text-stone-900" : "text-stone-400 hover:text-stone-600"
              )}
            >
              {t("listingPanel.priceDescSort")}
            </button>
            <div className="relative group">
              <span className="text-[10px] text-stone-400 border border-stone-300 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center cursor-default">i</span>
              <div className="absolute top-5 right-0 bg-stone-800 text-white text-[11px] px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                {t("listingPanel.priceSortHelp")}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {activeTab === "list" && (
          <div ref={scrollContainerRef} className="h-full overflow-y-auto px-3 py-4 sm:px-4">
            {topAiRecommendedListings.length > 0 && (
              <section className="-mx-4 -mt-4 mb-4 border-b border-emerald-200 bg-emerald-50/70">
                <div className="flex items-center gap-2 border-b border-emerald-200 px-5 py-3 text-sm font-bold text-emerald-800">
                  <Star className="h-4 w-4 fill-emerald-700 text-emerald-700" />
                  {t("listingPanel.aiRecommended")}
                </div>
                <div className="space-y-3 px-4 py-4">
                  {topAiRecommendedListings.map((listing, index) => (
                    <div key={`ai-${listing.id}`} className="relative pl-10">
                      <div className="absolute left-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white shadow-sm">
                        {index + 1}
                      </div>
                      <ListingCard
                        listing={listing}
                        isSelected={selectedListing?.id === listing.id}
                        onClick={handleListingClick}
                        onImageClick={handleListingClick}
                        isFavorite={favoriteIds.includes(Number(listing.id))}
                        isFavoriteLoading={favoriteLoadingIds.includes(Number(listing.id))}
                        onToggleFavorite={() => onToggleFavorite(Number(listing.id))}
                        requiresLogin={!isLoggedIn}
                        onLoginRequired={onLoginRequired}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
            {topAiRecommendedListings.length > 0 && (
              <div className="-mx-4 mb-4 border-y border-stone-200 bg-stone-100/70 px-5 py-3 text-sm font-bold text-stone-700">
                {t("listingPanel.allListings")}
              </div>
            )}
            <div className="mx-auto w-full max-w-[720px] space-y-4">
              {listings.map((listing) => (
                <div key={listing.id} className="cursor-pointer transition-transform duration-200">
                  <ListingCard
                    listing={listing}
                    isSelected={selectedListing?.id === listing.id}
                    onClick={handleListingClick}
                    onImageClick={handleListingClick}
                    isFavorite={favoriteIds.includes(Number(listing.id))}
                    isFavoriteLoading={favoriteLoadingIds.includes(Number(listing.id))}
                    onToggleFavorite={() => onToggleFavorite(Number(listing.id))}
                    requiresLogin={!isLoggedIn}
                    onLoginRequired={onLoginRequired}
                  />
                </div>
              ))}
            </div>
            <div ref={observerRef} className="h-10" />
            {isLoading && (
              <div className="py-6 text-center text-sm font-medium text-stone-500">
                {t("listingPanel.loadingMore")}
              </div>
            )}
            {!hasMore && listings.length > 0 && (
              <div className="py-6 text-center text-sm font-medium text-stone-400">
                {t("listingPanel.lastListing")}
              </div>
            )}
            {!isLoading && listings.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-stone-200 bg-white/80 px-4 py-10 text-center text-sm font-medium text-stone-500 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                {t("listingPanel.emptyListings")}
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
            similarSearchParams={similarSearchParams}
            onSimilarListingsFound={(similarListings, imageUrl) => {
              onSimilarListingsFound?.(similarListings, imageUrl);
              setActiveTab("list");
            }}
            onPhotoClick={onAIPhotoClick}
            canFindSimilarRooms={canFindSimilarRooms}
            onFindSimilarBlocked={onFindSimilarBlocked}
          />
        </div>

        {activeTab === "wish" && isLoggedIn && (
          <div className="h-full overflow-y-auto px-3 py-4 sm:px-4">
            {favoriteListings.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-stone-200 bg-white/80 px-4 py-10 text-center text-sm font-medium text-stone-500 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                {t("listingPanel.emptyFavorites")}
              </div>
            ) : (
              <div className="mx-auto w-full max-w-[720px] space-y-4">
                {favoriteListings.map((listing) => (
                  <div key={listing.id} className="cursor-pointer transition-transform duration-200">
                    <ListingCard
                      listing={listing}
                      isSelected={selectedListing?.id === listing.id}
                      onClick={handleWishClick}
                      onImageClick={handleWishClick}
                      isFavorite={true}
                      isFavoriteLoading={favoriteLoadingIds.includes(Number(listing.id))}
                      onToggleFavorite={() => onToggleFavorite(Number(listing.id))}
                      requiresLogin={!isLoggedIn}
                      onLoginRequired={onLoginRequired}
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
