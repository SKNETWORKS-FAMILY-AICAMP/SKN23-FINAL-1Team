"use client"

import { useState } from "react"
import { Header } from "@/components/room-finder/header"
import { FilterBar, type Filters } from "@/components/room-finder/filter-bar"
import { MapView, type Listing } from "@/components/room-finder/map-view"
import { ListingPanel } from "@/components/room-finder/listing-panel"
import { mockListings } from "@/lib/mock-data"

const defaultFilters: Filters = {
  transactionType: "all",
  price: "all",
  structure: "all",
  size: "all",
  options: "all",
}

function filterListings(listings: typeof mockListings, filters: Filters) {
  return listings.filter((listing) => {
    if (filters.transactionType !== "all") {
      if (filters.transactionType === "monthly" && !listing.monthlyRent) return false
      if (filters.transactionType === "jeonse" && listing.monthlyRent) return false
    }
    if (filters.structure !== "all") {
      const structureMap: Record<string, string> = {
        open: "오픈형",
        separated: "분리형",
        duplex: "복층",
      }
      if (listing.structure !== structureMap[filters.structure]) return false
    }
    return true
  })
}

export function HomeContainer() {
  const [roomType, setRoomType] = useState<"oneroom" | "tworoom">("oneroom")
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [searchQuery, setSearchQuery] = useState("가산디지털단지역")
  const [, setSelectedListing] = useState<Listing | null>(null)
  const [mobileView, setMobileView] = useState<"map" | "list">("map")

  const filteredListings = filterListings(mockListings, filters)

  return (
    <div className="flex flex-col h-screen bg-ivory">
      <Header roomType={roomType} onRoomTypeChange={setRoomType} />
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      {/* Mobile View Toggle */}
      <div className="flex lg:hidden border-b border-border-warm bg-cream">
        <button
          onClick={() => setMobileView("map")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileView === "map"
              ? "text-neutral-dark border-b-2 border-warm-brown"
              : "text-neutral-muted"
          }`}
        >
          지도
        </button>
        <button
          onClick={() => setMobileView("list")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileView === "list"
              ? "text-neutral-dark border-b-2 border-warm-brown"
              : "text-neutral-muted"
          }`}
        >
          매물목록
        </button>
      </div>

      {/* Desktop Layout */}
      <main className="hidden lg:flex flex-1 overflow-hidden">
        <section className="flex-1 relative">
          <MapView
            searchQuery={searchQuery}
            listings={filteredListings}
            onMarkerClick={setSelectedListing}
          />
        </section>
        <aside className="w-[400px] xl:w-[450px] border-l border-border-warm">
          <ListingPanel
            listings={filteredListings}
            onListingClick={setSelectedListing}
          />
        </aside>
      </main>

      {/* Mobile Layout */}
      <main className="flex lg:hidden flex-1 overflow-hidden">
        {mobileView === "map" ? (
          <section className="flex-1 relative">
            <MapView
              searchQuery={searchQuery}
              listings={filteredListings}
              onMarkerClick={(listing) => {
                setSelectedListing(listing)
                setMobileView("list")
              }}
            />
          </section>
        ) : (
          <aside className="flex-1">
            <ListingPanel
              listings={filteredListings}
              onListingClick={setSelectedListing}
            />
          </aside>
        )}
      </main>
    </div>
  )
}
