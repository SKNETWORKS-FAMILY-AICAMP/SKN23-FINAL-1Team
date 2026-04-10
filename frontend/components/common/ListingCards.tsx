"use client";

import type { Listing } from "@/components/room-finder/map-view";
import { Card, CardContent } from "@/components/ui/card";

interface ListingCardProps {
  listing: Listing;
  isSelected?: boolean;
  onClick?: (listing: Listing) => void;
}

export function ListingCard({
  listing,
  isSelected = false,
  onClick,
}: ListingCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(listing)}
      className="w-full text-left"
    >
      <Card
        className={`gap-0 overflow-hidden py-0 transition ${
          isSelected
            ? "border-warm-brown bg-amber-50"
            : "border-border-warm bg-white hover:bg-neutral-50"
        }`}
      >
        <div className="aspect-4/3 overflow-hidden bg-gray-100">
          {listing.images?.[0] ? (
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              이미지 없음
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <div>
            <p className="text-2xl font-semibold">{listing.title}</p>
            <p className="text-lg">{listing.price}</p>
          </div>
          {/* <div className="mt-1 text-sm text-gray-700">{listing.price}</div> */}
          <div className="mt-1 text-sm text-gray-500">{listing.address}</div>
          <div className="mt-1 text-sm text-gray-500">
            {listing.size} · {listing.floor}층
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
