"use client"

import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { Listing } from "./map-view"
import { AIRecommendation } from "./ai-recommendation"

interface ListingPanelProps {
  listings: Listing[]
  onListingClick?: (listing: Listing) => void
}

export function ListingPanel({ listings, onListingClick }: ListingPanelProps) {
  const [activeTab, setActiveTab] = useState<"listings" | "ai">("listings")
  const [aiRecommendedListings, setAiRecommendedListings] = useState<Listing[]>([])
  const [showAiResults, setShowAiResults] = useState(false)

  const handleSimilarListingsFound = (similarListings: Listing[]) => {
    setAiRecommendedListings(similarListings)
    setShowAiResults(true)
  }

  return (
    <div className="flex flex-col h-full bg-linen">
      {/* Tab Header */}
      <div className="flex p-3 md:p-4">
        <button
          onClick={() => {
            setActiveTab("listings")
            setShowAiResults(false)
          }}
          className={cn(
            "px-4 md:px-6 py-2 rounded-l-full text-sm md:text-base font-medium transition-colors",
            activeTab === "listings"
              ? "bg-linen text-neutral-dark shadow-sm"
              : "bg-transparent text-neutral-muted hover:text-neutral-dark"
          )}
        >
          매물목록
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={cn(
            "px-4 md:px-6 py-2 rounded-r-full text-sm md:text-base font-medium transition-colors",
            activeTab === "ai"
              ? "bg-tab-active text-ivory"
              : "bg-transparent text-neutral-muted hover:text-neutral-dark"
          )}
        >
          AI 추천
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "listings" ? (
          <ListingsContent listings={listings} onListingClick={onListingClick} />
        ) : showAiResults ? (
          <div className="flex flex-col h-full">
            <ListingsContent
              listings={aiRecommendedListings}
              onListingClick={onListingClick}
            />
            <AIRecommendation
              onSimilarListingsFound={handleSimilarListingsFound}
              allListings={listings}
              compact
            />
          </div>
        ) : (
          <AIRecommendation
            onSimilarListingsFound={handleSimilarListingsFound}
            allListings={listings}
          />
        )}
      </div>
    </div>
  )
}

interface ListingsContentProps {
  listings: Listing[]
  onListingClick?: (listing: Listing) => void
}

function ListingsContent({ listings, onListingClick }: ListingsContentProps) {
  if (listings.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-muted text-sm md:text-base">
        검색 결과가 없습니다.
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full p-3 md:p-4 flex flex-col gap-3 md:gap-4">
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          onClick={() => onListingClick?.(listing)}
        />
      ))}
    </div>
  )
}

interface ListingCardProps {
  listing: Listing
  onClick?: () => void
}

function ListingCard({ listing, onClick }: ListingCardProps) {
  return (
    <div
      onClick={onClick}
      className="flex gap-3 md:gap-4 p-2 md:p-3 bg-linen rounded-lg cursor-pointer hover:shadow-md transition-shadow border border-border-warm"
    >
      <div className="relative w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-md overflow-hidden bg-beige">
        {listing.images[0] ? (
          <Image
            src={listing.images[0]}
            alt={listing.title}
            fill
            loading="eager"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-muted text-xs">
            이미지 없음
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-neutral-dark truncate text-sm md:text-base">{listing.title}</h3>
        <p className="text-xs md:text-sm text-warm-brown font-semibold mt-1">
          {listing.monthlyRent ? `월세 ${listing.deposit}/${listing.monthlyRent}` : `전세 ${listing.deposit}`}
        </p>
        <p className="text-xs text-neutral-muted mt-1 truncate">
          {listing.address}
        </p>
        <p className="text-xs text-neutral-muted">
          {listing.size} · {listing.floor} · {listing.structure}
        </p>
      </div>
    </div>
  )
}
