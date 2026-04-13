"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/room-finder/header";
import { FilterBar, type Filters } from "@/components/room-finder/filter-bar";
import {
  MapView,
  type Listing,
  type MapBounds,
  type MapItem,
} from "@/components/room-finder/map-view";
import { ListingPanel } from "@/components/room-finder/listing-panel";
import { fetchItems, fetchMapItems } from "@/app/api/rooms/route";
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

function isSameBounds(a: MapBounds | null, b: MapBounds | null) {
  if (!a || !b) return false;

  return (
    a.swLat === b.swLat &&
    a.swLng === b.swLng &&
    a.neLat === b.neLat &&
    a.neLng === b.neLng &&
    a.centerLat === b.centerLat &&
    a.centerLng === b.centerLng &&
    a.level === b.level
  );
}

export function HomeContainer() {
  const [roomType, setRoomType] = useState<"oneroom" | "tworoom">("oneroom");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const [listings, setListings] = useState<Listing[]>([]);
  const [mapItems, setMapItems] = useState<MapItem[]>([]);
  const [visibleListings, setVisibleListings] = useState<Listing[]>([]);
  const [recommendedListings, setRecommendedListings] = useState<
    Listing[] | null
  >(null);

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasRequestFailed, setHasRequestFailed] = useState(false);
  const [isLocationReady, setIsLocationReady] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);

  const panelListings = recommendedListings ?? listings;

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
    setMapItems([]);
    setVisibleListings([]);
    setRecommendedListings(null);
    setSelectedListing(null);
    setOffset(0);
    setHasMore(true);
    setHasRequestFailed(false);
    setIsInitialLoading(true);
  }, [requestKey]);

  const handleVisibleListingsChange = useCallback((nextListings: Listing[]) => {
    setVisibleListings(nextListings);
  }, []);

  const handleInitialLocationResolved = useCallback(() => {
    setIsLocationReady((prev) => (prev ? prev : true));
  }, []);

  const handleBoundsChange = useCallback((nextBounds: MapBounds) => {
    setMapBounds((prev) => {
      if (isSameBounds(prev, nextBounds)) {
        return prev;
      }

      return nextBounds;
    });
  }, []);

  useEffect(() => {
    if (!selectedListing) return;

    const sourceListings =
      (recommendedListings ?? visibleListings.length)
        ? (recommendedListings ?? visibleListings)
        : listings;

    const stillVisible = sourceListings.some(
      (listing) => listing.id === selectedListing.id,
    );

    if (!stillVisible && !recommendedListings) {
      setSelectedListing(null);
    }
  }, [listings, visibleListings, recommendedListings, selectedListing]);

  useEffect(() => {
    const controller = new AbortController();

    const loadPagedItems = async () => {
      if (!isLocationReady || !mapBounds) return;
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
          lat: mapBounds.centerLat,
          lng: mapBounds.centerLng,
          swLat: mapBounds.swLat,
          swLng: mapBounds.swLng,
          neLat: mapBounds.neLat,
          neLng: mapBounds.neLng,
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

    loadPagedItems();

    return () => {
      controller.abort();
    };
  }, [
    isLocationReady,
    mapBounds,
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

  useEffect(() => {
    const controller = new AbortController();

    const loadMapItems = async () => {
      if (!isLocationReady || !mapBounds) return;

      try {
        const data = await fetchMapItems({
          search: debouncedSearchQuery,
          transactionType: filters.transactionType,
          roomType: roomType === "oneroom" ? "원룸" : "투룸",
          structure: filters.structure,
          deposit: filters.deposit,
          monthlyRent: filters.monthlyRent,
          size: filters.size,
          sizeUnit: filters.sizeUnit,
          options: filters.options,
          lat: mapBounds.centerLat,
          lng: mapBounds.centerLng,
          swLat: mapBounds.swLat,
          swLng: mapBounds.swLng,
          neLat: mapBounds.neLat,
          neLng: mapBounds.neLng,
          level: mapBounds.level,
          signal: controller.signal,
        });

        setMapItems(data.items);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
      }
    };

    loadMapItems();

    return () => {
      controller.abort();
    };
  }, [
    isLocationReady,
    mapBounds,
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
  ]);

  const prevBoundsRef = useRef<MapBounds | null>(null);

  useEffect(() => {
    if (!mapBounds) return;

    const prevBounds = prevBoundsRef.current;
    prevBoundsRef.current = mapBounds;

    if (!prevBounds) return;
    if (isSameBounds(prevBounds, mapBounds)) return;

    setOffset(0);
    setHasMore(true);
    setListings([]);
    setIsInitialLoading(true);
    setHasRequestFailed(false);
  }, [mapBounds]);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore || recommendedListings) return;
    setOffset((prev) => prev + PAGE_SIZE);
  }, [hasMore, isLoading, recommendedListings]);

  return (
    <div className="flex h-screen flex-col bg-ivory">
      <Header roomType={roomType} onRoomTypeChange={setRoomType} />

      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="border-b border-stone-200/80 bg-white/70 px-4 py-2 backdrop-blur-md lg:hidden">
        <div className="grid grid-cols-2 rounded-2xl border border-stone-200/80 bg-stone-100/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <button
            onClick={() => setMobileView("map")}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200 ${
              mobileView === "map"
                ? "bg-white text-stone-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            지도
          </button>

          <button
            onClick={() => setMobileView("list")}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200 ${
              mobileView === "list"
                ? "bg-white text-stone-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            매물목록
          </button>
        </div>
      </div>

      <main className="relative hidden flex-1 overflow-hidden lg:block scroll-none">
        <section className="absolute inset-0 z-0">
          <MapView
            searchQuery={debouncedSearchQuery}
            mapItems={mapItems}
            selectedListing={selectedListing}
            onMarkerClick={setSelectedListing}
            onVisibleListingsChange={handleVisibleListingsChange}
            onInitialLocationResolved={handleInitialLocationResolved}
            onBoundsChange={handleBoundsChange}
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
              mapItems={mapItems}
              selectedListing={selectedListing}
              onMarkerClick={(listing) => {
                setSelectedListing(listing);
                setMobileView("list");
              }}
              onVisibleListingsChange={handleVisibleListingsChange}
              onInitialLocationResolved={handleInitialLocationResolved}
              onBoundsChange={handleBoundsChange}
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

      {(!isLocationReady || isInitialLoading) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/10">
          <div className="rounded-lg bg-white px-4 py-3 shadow-md">
            현재 위치 기준 매물 불러오는 중...
          </div>
        </div>
      )}
    </div>
  );
}
