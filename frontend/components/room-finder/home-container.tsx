"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/room-finder/header";
import { FilterBar, type Filters } from "@/components/room-finder/filter-bar";
import { MapView, type Listing } from "@/components/room-finder/map-view";
import { ListingPanel } from "@/components/room-finder/listing-panel";
import { fetchItems } from "@/app/api/rooms/route";
import { mapItemToListing } from "@/utils/roomMappers";

const PAGE_SIZE = 20;

const defaultFilters: Filters = {
  transactionType: "all",
  price: "all",
  structure: "all",
  size: "all",
  sizeUnit: "m2",
  options: [],
};

export function HomeContainer() {
  const [roomType, setRoomType] = useState<"oneroom" | "tworoom">("oneroom");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const [listings, setListings] = useState<Listing[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasRequestFailed, setHasRequestFailed] = useState(false);

  const requestKey = useMemo(() => {
    return JSON.stringify({
      search: debouncedSearchQuery,
      transactionType: filters.transactionType,
      structure: filters.structure,
      price: filters.price,
      size: filters.size,
      sizeUnit: filters.sizeUnit,
      options: filters.options,
      roomType,
    });
  }, [
    debouncedSearchQuery,
    filters.transactionType,
    filters.structure,
    filters.price,
    filters.size,
    filters.sizeUnit,
    filters.options,
    roomType,
  ]);

  console.log(filters, "tttttt");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    setHasRequestFailed(false);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const prevRequestKeyRef = useRef<string>("");

  useEffect(() => {
    if (prevRequestKeyRef.current === requestKey) return;

    prevRequestKeyRef.current = requestKey;
    setListings([]);
    setOffset(0);
    setHasMore(true);
    setIsInitialLoading(true);
    setHasRequestFailed(false);
  }, [requestKey]);

  useEffect(() => {
    let cancelled = false;

    const loadItems = async () => {
      if (isLoading || !hasMore || hasRequestFailed) return;

      setIsLoading(true);

      try {
        const data = await fetchItems({
          offset,
          limit: PAGE_SIZE,
          search: debouncedSearchQuery,
          transactionType: filters.transactionType,
          roomType: roomType === "oneroom" ? "원룸" : "투룸",
          structure: filters.structure,
          price: filters.price,
          size: filters.size,
          sizeUnit: filters.sizeUnit,
          options: filters.options,
        });

        if (cancelled) return;

        const mapped = data.items.map(mapItemToListing);
        console.log(data);
        setListings((prev) => (offset === 0 ? mapped : [...prev, ...mapped]));
        setHasMore(data.has_more);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setHasRequestFailed(true);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsInitialLoading(false);
        }
      }
    };

    loadItems();

    return () => {
      cancelled = true;
    };
  }, [offset, requestKey]);

  const loadMore = () => {
    if (isLoading || !hasMore) return;
    setOffset((prev) => prev + PAGE_SIZE);
  };

  return (
    <div className="flex flex-col h-screen bg-ivory">
      <Header roomType={roomType} onRoomTypeChange={setRoomType} />
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

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

      <main className="relative hidden lg:block flex-1 overflow-hidden">
        <section className="absolute inset-0 z-0">
          <MapView
            searchQuery={debouncedSearchQuery}
            listings={listings}
            onMarkerClick={setSelectedListing}
          />
        </section>

        <aside
          className={`absolute top-0 right-0 h-full bg-ivory/95 backdrop-blur-sm border-l border-border-warm shadow-xl overflow-hidden transition-transform duration-500 ease-in-out z-20 ${
            isPanelOpen
              ? "translate-x-0 w-[400px] xl:w-[450px]"
              : "translate-x-[calc(100%-56px)] w-[400px] xl:w-[450px]"
          }`}
        >
          <button
            type="button"
            onClick={() => setIsPanelOpen((prev) => !prev)}
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-border-warm bg-white shadow-lg hover:bg-neutral-50 transition-colors"
            aria-label={isPanelOpen ? "매물 패널 닫기" : "매물 패널 열기"}
          >
            <span className="text-xl leading-none">
              {isPanelOpen ? "›" : "‹"}
            </span>
          </button>

          <div
            className={`h-full transition-opacity duration-500 ${
              isPanelOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <ListingPanel
              listings={listings}
              selectedListing={selectedListing}
              isLoading={isLoading}
              hasMore={hasMore}
              onLoadMore={loadMore}
              onListingClick={setSelectedListing}
            />
          </div>
        </aside>
      </main>

      <main className="flex lg:hidden flex-1 overflow-hidden">
        {mobileView === "map" ? (
          <section className="flex-1 relative">
            <MapView
              searchQuery={debouncedSearchQuery}
              listings={listings}
              onMarkerClick={(listing) => {
                setSelectedListing(listing);
                setMobileView("list");
              }}
            />
          </section>
        ) : (
          <aside className="flex-1">
            <ListingPanel
              listings={listings}
              selectedListing={selectedListing}
              isLoading={isLoading}
              hasMore={hasMore}
              onLoadMore={loadMore}
              onListingClick={setSelectedListing}
            />
          </aside>
        )}
      </main>

      {isInitialLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/10">
          <div className="rounded-lg bg-white px-4 py-3 shadow-md">
            매물 불러오는 중...
          </div>
        </div>
      )}
    </div>
  );
}
