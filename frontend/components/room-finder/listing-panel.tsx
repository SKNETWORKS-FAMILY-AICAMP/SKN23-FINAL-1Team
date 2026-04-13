"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Listing } from "@/components/room-finder/map-view";
import { ListingCard } from "@/components/common/ListingCards";
import { AIRecommendation } from "@/components/room-finder/ai-recommendation";

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
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border-warm bg-ivory px-4 pt-6">
        <div className="mb-4 text-lg font-semibold text-neutral-dark">
          {headerTitle}
        </div>

        <div className="grid grid-cols-2 rounded-xl bg-cream p-1">
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "list"
                ? "bg-white text-neutral-dark shadow-sm"
                : "text-neutral-muted hover:text-neutral-dark"
            }`}
          >
            매물목록
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "ai"
                ? "bg-white text-neutral-dark shadow-sm"
                : "text-neutral-muted hover:text-neutral-dark"
            }`}
          >
            AI추천
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === "list" ? (
          <div className="h-full overflow-y-auto p-4 ">
            <div className="space-y-3">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="cursor-pointer scale-100 transition-transform hover:scale-[1.02]"
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
              <div className="py-4 text-center text-sm text-gray-500">
                더 불러오는 중...
              </div>
            )}

            {!hasMore && listings.length > 0 && (
              <div className="py-4 text-center text-sm text-gray-400">
                마지막 매물입니다.
              </div>
            )}

            {!isLoading && listings.length === 0 && (
              <div className="py-10 text-center text-sm text-neutral-muted">
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
