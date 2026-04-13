"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Listing } from "@/components/room-finder/map-view";
import { ListingCard } from "@/components/common/ListingCards";
import { AIRecommendation } from "@/components/room-finder/ai-recommendation";
import { Sparkles, House } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListingPanelProps {
  listings: Listing[];
  selectedListing?: Listing | null;
  onListingClick?: (listing: Listing) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  onSimilarListingsFound?: (listings: Listing[]) => void;
}

type PanelTab = "list" | "ai";

export function ListingPanel({
  listings,
  selectedListing,
  onListingClick,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  onSimilarListingsFound,
}: ListingPanelProps) {
  const observerRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<PanelTab>("list");

  useEffect(() => {
    if (activeTab !== "list") return;
    if (!observerRef.current || !onLoadMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !isLoading) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0,
      },
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [activeTab, hasMore, isLoading, onLoadMore]);

  const headerTitle = useMemo(() => {
    return activeTab === "list" ? "매물 목록" : "AI 추천";
  }, [activeTab]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white md:bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(245,242,236,0.92)_100%)]">
      <div className="border-b border-stone-200/80 bg-white/70 px-5 pb-4 pt-6 backdrop-blur-md">
        <div className="mb-4">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400">
            Curated Space
          </p>
          <div className="mt-1 text-xl font-bold tracking-tight text-stone-900">
            {headerTitle}
          </div>
        </div>

        <div className="grid grid-cols-2 rounded-2xl border border-stone-200/80 bg-stone-100/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200",
              activeTab === "list"
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
              "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200",
              activeTab === "ai"
                ? "bg-white text-stone-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                : "text-stone-500 hover:text-stone-800",
            )}
          >
            <Sparkles className="h-4 w-4" />
            AI추천
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === "list" ? (
          <div className="h-full overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="cursor-pointer transition-transform duration-200"
                >
                  <ListingCard
                    listing={listing}
                    isSelected={selectedListing?.id === listing.id}
                    onClick={onListingClick}
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
        ) : (
          <AIRecommendation
            allListings={listings}
            onSimilarListingsFound={(similarListings) => {
              onSimilarListingsFound?.(similarListings);
              setActiveTab("list");
            }}
          />
        )}
      </div>
    </div>
  );
}
