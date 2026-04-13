"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/room-finder/header";
import { FilterBar, type Filters } from "@/components/room-finder/filter-bar";
import { MapView, type Listing } from "@/components/room-finder/map-view";
import { ListingPanel } from "@/components/room-finder/listing-panel";
import { fetchItems } from "@/app/api/rooms/route";
import { mapItemToListing } from "@/utils/roomMappers";
import { ListingDetailPanel } from "@/components/room-finder/listing-detail-panel";

const PAGE_SIZE = 20;

const defaultFilters: Filters = {
  transactionType: "all",
  deposit: "all",
  monthlyRent: "all",
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
  const [visibleListings, setVisibleListings] = useState<Listing[]>([]);
  const [recommendedListings, setRecommendedListings] = useState<
    Listing[] | null
  >(null);

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasRequestFailed, setHasRequestFailed] = useState(false);

  const mapListings = recommendedListings ?? listings;
  const panelListings = recommendedListings ? mapListings : visibleListings;
  const displayListings = recommendedListings ?? listings;

  const requestKey = useMemo(() => {
    return JSON.stringify({
      search: debouncedSearchQuery,
      transactionType: filters.transactionType,
      deposit: filters.deposit,
      monthlyRent: filters.monthlyRent,
      structure: filters.structure,
      size: filters.size,
      sizeUnit: filters.sizeUnit,
      options: filters.options,
      roomType,
    });
  }, [
    debouncedSearchQuery,
    filters.transactionType,
    filters.deposit,
    filters.monthlyRent,
    filters.structure,
    filters.size,
    filters.sizeUnit,
    filters.options,
    roomType,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const prevRequestKeyRef = useRef<string>("");

  useEffect(() => {
    if (prevRequestKeyRef.current === requestKey) return;

    prevRequestKeyRef.current = requestKey;
    setListings([]);
    setVisibleListings([]);
    setRecommendedListings(null);
    setSelectedListing(null);
    setOffset(0);
    setHasMore(true);
    setHasRequestFailed(false);
    setIsInitialLoading(true);
  }, [requestKey]);

  useEffect(() => {
    const controller = new AbortController();

    const loadItems = async () => {
      if (!hasMore || hasRequestFailed) return;

      setIsLoading(true);

      try {
        const data = await fetchItems({
          offset,
          limit: PAGE_SIZE,
          search: debouncedSearchQuery,
          transactionType: filters.transactionType,
          roomType: roomType === "oneroom" ? "원룸" : "투룸",
          structure: filters.structure,
          deposit: filters.deposit,
          monthlyRent: filters.monthlyRent,
          size: filters.size,
          sizeUnit: filters.sizeUnit,
          options: filters.options,
          signal: controller.signal,
        });

        const mapped = data.items.map(mapItemToListing);

        setListings((prev) => (offset === 0 ? mapped : [...prev, ...mapped]));
        setHasMore(data.has_more);
        setHasRequestFailed(false);
      } catch (error) {
        if (controller.signal.aborted) return;

        console.error(error);
        setHasRequestFailed(true);
        setHasMore(false);
      } finally {
        if (controller.signal.aborted) return;

        setIsLoading(false);
        setIsInitialLoading(false);
      }
    };

    loadItems();

    return () => {
      controller.abort();
    };
  }, [
    offset,
    requestKey,
    debouncedSearchQuery,
    filters.transactionType,
    filters.deposit,
    filters.monthlyRent,
    filters.structure,
    filters.size,
    filters.sizeUnit,
    filters.options,
    roomType,
    hasMore,
    hasRequestFailed,
  ]);

  const handleVisibleListingsChange = useCallback((nextListings: Listing[]) => {
    setVisibleListings(nextListings);
  }, []);

  useEffect(() => {
    if (!selectedListing) return;

    const sourceListings = recommendedListings ?? visibleListings;
    const stillVisible = sourceListings.some(
      (listing) => listing.id === selectedListing.id,
    );

    if (!stillVisible) {
      setSelectedListing(null);
    }
  }, [visibleListings, recommendedListings, selectedListing]);

  const loadMore = () => {
    if (isLoading || !hasMore || recommendedListings) return;
    setOffset((prev) => prev + PAGE_SIZE);
  };

  return (
    <div className="flex h-screen flex-col bg-ivory">
      <Header roomType={roomType} onRoomTypeChange={setRoomType} />

      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex border-b border-border-warm bg-cream lg:hidden">
        <button
          onClick={() => setMobileView("map")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileView === "map"
              ? "border-b-2 border-warm-brown text-neutral-dark"
              : "text-neutral-muted"
          }`}
        >
          지도
        </button>
        <button
          onClick={() => setMobileView("list")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileView === "list"
              ? "border-b-2 border-warm-brown text-neutral-dark"
              : "text-neutral-muted"
          }`}
        >
          매물목록
        </button>
      </div>

      <main className="relative hidden flex-1 overflow-hidden lg:block scroll-none">
        <section className="absolute inset-0 z-0">
          <MapView
            searchQuery={debouncedSearchQuery}
            listings={mapListings}
            onMarkerClick={setSelectedListing}
            onVisibleListingsChange={handleVisibleListingsChange}
          />
        </section>

        <ListingDetailPanel
          listing={selectedListing}
          isOpen={!!selectedListing}
          onClose={() => setSelectedListing(null)}
          listPanelOpen={isPanelOpen}
        />

        <aside
          className={`absolute top-0 right-0 z-20 h-full overflow-hidden border-l border-border-warm bg-ivory/95 shadow-xl backdrop-blur-sm transition-transform duration-500 ease-in-out ${
            isPanelOpen
              ? "translate-x-0 w-[400px] xl:w-[450px]"
              : "translate-x-[calc(100%-56px)] w-[400px] xl:w-[450px]"
          }`}
        >
          <button
            type="button"
            onClick={() => setIsPanelOpen((prev) => !prev)}
            className="absolute top-1/2 left-0 z-30 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border-warm bg-white shadow-lg transition-colors hover:bg-orange-300"
            aria-label={isPanelOpen ? "매물 패널 닫기" : "매물 패널 열기"}
          >
            <span className="text-xl leading-none">
              {isPanelOpen ? "›" : "‹"}
            </span>
          </button>

          <div
            className={`h-full transition-opacity duration-500 ${
              isPanelOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <ListingPanel
              listings={panelListings}
              selectedListing={selectedListing}
              isLoading={isLoading}
              hasMore={recommendedListings ? false : hasMore}
              onLoadMore={loadMore}
              onListingClick={setSelectedListing}
              onSimilarListingsFound={(similar) => {
                setRecommendedListings(similar);
                setSelectedListing(similar[0] ?? null);
              }}
            />
          </div>
        </aside>
      </main>

      <main className="flex flex-1 overflow-hidden lg:hidden">
        {mobileView === "map" ? (
          <section className="relative flex-1">
            <MapView
              searchQuery={debouncedSearchQuery}
              listings={mapListings}
              onMarkerClick={(listing) => {
                setSelectedListing(listing);
                setMobileView("list");
              }}
              onVisibleListingsChange={handleVisibleListingsChange}
            />
          </section>
        ) : (
          <aside className="flex-1">
            <ListingPanel
              listings={panelListings}
              selectedListing={selectedListing}
              isLoading={isLoading}
              hasMore={recommendedListings ? false : hasMore}
              onLoadMore={loadMore}
              onListingClick={setSelectedListing}
              onSimilarListingsFound={(similar) => {
                setRecommendedListings(similar);
                setSelectedListing(similar[0] ?? null);
              }}
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
