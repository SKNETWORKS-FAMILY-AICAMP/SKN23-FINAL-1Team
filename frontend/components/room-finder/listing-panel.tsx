"use client";

import { useEffect, useRef } from "react";
import type { Listing } from "@/components/room-finder/map-view";
import { ListingCard } from "@/components/common/ListingCards";

interface ListingPanelProps {
  listings: Listing[];
  selectedListing?: Listing | null;
  onListingClick?: (listing: Listing) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

export function ListingPanel({
  listings,
  selectedListing,
  onListingClick,
  onLoadMore,
  hasMore = false,
  isLoading = false,
}: ListingPanelProps) {
  const observerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
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
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <div className="h-full overflow-y-auto p-4 pt-6">
      <div className="mb-4 text-lg font-semibold text-neutral-dark">
        매물 목록
      </div>

      <div className="space-y-3">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            isSelected={selectedListing?.id === listing.id}
            onClick={onListingClick}
          />
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
    </div>
  );
}
