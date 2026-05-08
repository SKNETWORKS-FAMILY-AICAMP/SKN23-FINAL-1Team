"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogIn, X } from "lucide-react";
import { Header } from "@/components/room-finder/header";
import { FilterBar, type Filters } from "@/components/room-finder/filter-bar";
import {
  MapView,
  type Listing,
  type MapBounds,
  type MapFocusRequest,
  type MapItem,
} from "@/components/room-finder/map-view";
import { ListingPanel } from "@/components/room-finder/listing-panel";
import {
  buildSearchBody,
  fetchItems,
  fetchMapItems,
  fetchRoomDetail,
  type RoomSearchParams,
} from "@/lib/api/rooms";
import { mapItemToListing, mapSimilarItemToListing } from "@/utils/roomMappers";
import { ListingDetailPanel } from "@/components/room-finder/listing-detail-panel";
import { useAuthStore } from "@/store/authStore";
import { usePendingListingStore } from "@/store/pendingListingStore";
import {
  fetchFavorites,
  addFavorite,
  removeFavorite,
} from "@/lib/api/favorites";
import { useRecentStore } from "@/store/recentStore";
import { OnboardingGuide } from "@/components/room-finder/OnboardingGuide";
import { useFavoriteToast } from "@/hooks/useFavoriteToast";
import { Toast } from "@/components/common/Toast";
import { SimilarListingsOverlay } from "@/components/common/SimilarListingsOverlay";

const PAGE_SIZE = 20;
const BOUNDS_PRECISION = 5;
const MAP_BOUNDS_DEBOUNCE_MS = 350;
const MAX_SIMILAR_SEARCH_LEVEL = 7;
const ONE_ROOM_MAX_DEPOSIT = 20000;
const TWO_ROOM_MAX_DEPOSIT = 60000;
const ONE_ROOM_MAX_SIZE_M2 = 66;
const TWO_ROOM_MAX_SIZE_M2 = 99;
const ONE_ROOM_MAX_SIZE_PYEONG = 20;
const TWO_ROOM_MAX_SIZE_PYEONG = 30;

function getMaxDepositByRoomType(roomType: "oneroom" | "tworoom") {
  return roomType === "tworoom" ? TWO_ROOM_MAX_DEPOSIT : ONE_ROOM_MAX_DEPOSIT;
}

function getMaxSizeByRoomType(
  roomType: "oneroom" | "tworoom",
  sizeUnit: Filters["sizeUnit"],
) {
  if (sizeUnit === "m2") {
    return roomType === "tworoom" ? TWO_ROOM_MAX_SIZE_M2 : ONE_ROOM_MAX_SIZE_M2;
  }

  return roomType === "tworoom"
    ? TWO_ROOM_MAX_SIZE_PYEONG
    : ONE_ROOM_MAX_SIZE_PYEONG;
}

const defaultFilters: Filters = {
  transactionType: "all",
  deposit: "all",
  monthlyRent: "all",
  structure: [],
  size: "all",
  sizeUnit: "m2",
  floor: "all",
  options: [],
};

function roundBoundsValue(value: number) {
  return Number(value.toFixed(BOUNDS_PRECISION));
}

function normalizeBounds(bounds: MapBounds): MapBounds {
  return {
    ...bounds,
    swLat: roundBoundsValue(bounds.swLat),
    swLng: roundBoundsValue(bounds.swLng),
    neLat: roundBoundsValue(bounds.neLat),
    neLng: roundBoundsValue(bounds.neLng),
    centerLat: roundBoundsValue(bounds.centerLat),
    centerLng: roundBoundsValue(bounds.centerLng),
  };
}

function getBoundsKey(bounds: MapBounds) {
  return [
    bounds.swLat,
    bounds.swLng,
    bounds.neLat,
    bounds.neLng,
    bounds.centerLat,
    bounds.centerLng,
    bounds.level,
  ].join(",");
}

function isSameBounds(a: MapBounds | null, b: MapBounds | null) {
  if (!a || !b) return false;
  return getBoundsKey(a) === getBoundsKey(b);
}

function shouldReloadByBounds(source?: MapBounds["source"]) {
  return (
    source === "initial" ||
    source === "user" ||
    source === "cluster" ||
    source === "search"
  );
}

function isAbortError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "AbortError" ||
    error.message.toLowerCase().includes("aborted")
  );
}

function logSimilarRoomScores(items: Listing[], context: string) {
  console.table(
    items.map((item, index) => ({
      rank: index + 1,
      itemId: item.id,
      similarity: item.embeddingSimilarity ?? null,
      title: item.title,
      address: item.address,
    })),
  );
  console.log(`[find-similar-rooms] ${context}: ${items.length} items`);
}

export function HomeContainer() {
  const router = useRouter();
  const [roomType, setRoomType] = useState<"oneroom" | "tworoom">("oneroom");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [sort, setSort] = useState<"latest" | "price_asc" | "price_desc">(
    "latest",
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenImages, setFullscreenImages] = useState<string[]>([]);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [aiFullscreenUrl, setAiFullscreenUrl] = useState<string | null>(null);
  const [isLoginGuideOpen, setIsLoginGuideOpen] = useState(false);
  const { toast, showToast, hideToast } = useFavoriteToast();

  const [listings, setListings] = useState<Listing[]>([]);
  const [visibleListings, setVisibleListings] = useState<Listing[]>([]);
  const [mapItems, setMapItems] = useState<MapItem[]>([]);
  const [recommendedListings, setRecommendedListings] = useState<
    Listing[] | null
  >(null);
  const [similarImageUrl, setSimilarImageUrl] = useState<string | null>(null);
  const [photoSimilarListings, setPhotoSimilarListings] = useState<Listing[]>(
    [],
  );
  const [isFindingPhotoSimilar, setIsFindingPhotoSimilar] = useState(false);

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasRequestFailed, setHasRequestFailed] = useState(false);
  const [isLocationReady, setIsLocationReady] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [mapFocusRequest, setMapFocusRequest] =
    useState<MapFocusRequest | null>(null);
  const [listScrollResetKey, setListScrollResetKey] = useState(0);
  const boundsDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const mapFocusRequestIdRef = useRef(0);

  const user = useAuthStore((state) => state.user);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const updateUser = useAuthStore((state) => state.updateUser);
  const addRecent = useRecentStore((state) => state.addRecent);
  const canFindSimilarRooms = Boolean(
    mapBounds && mapBounds.level <= MAX_SIMILAR_SEARCH_LEVEL,
  );

  const recordRecentListing = useCallback(
    (listing: Listing) => {
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
    },
    [addRecent],
  );

  const pendingListing = usePendingListingStore(
    (state) => state.pendingListing,
  );
  const clearPendingListing = usePendingListingStore(
    (state) => state.clearPendingListing,
  );
  const isPendingOpenRef = useRef(false);

  // 마이페이지에서 넘어온 매물 → 상세패널 자동 오픈
  const pendingListingRef = useRef<Listing | null>(null);

  useEffect(() => {
    if (!pendingListing) return;
    pendingListingRef.current = pendingListing;
    isPendingOpenRef.current = true;
    setIsDetailOpen(true);
    setIsPanelOpen(true);
    setIsInitialLoading(false);
    setIsLocationReady(true);
    recordRecentListing(pendingListing);
    clearPendingListing();
  }, [pendingListing, clearPendingListing, recordRecentListing]);

  // 지도 준비되면 pendingListing 위치로 이동
  useEffect(() => {
    if (!isLocationReady || !pendingListingRef.current) return;
    const listing = pendingListingRef.current;
    pendingListingRef.current = null;
    setSelectedListing(listing);
  }, [isLocationReady]);

  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [favoriteLoadingIds, setFavoriteLoadingIds] = useState<number[]>([]);

  // listings와 분리된 찜 목록 상태 — 지도 이동해도 유지됨
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);

  const panelListings = visibleListings.length > 0 ? visibleListings : listings;

  const requestKey = useMemo(() => {
    return JSON.stringify({
      search: "",
      transactionType: filters.transactionType,
      deposit: filters.deposit,
      monthlyRent: filters.monthlyRent,
      structure: roomType === "oneroom" ? filters.structure : [],
      size: filters.size,
      sizeUnit: filters.sizeUnit,
      floor: filters.floor,
      options: filters.options,
      roomType,
      sort,
    });
  }, [
    filters.transactionType,
    filters.deposit,
    filters.monthlyRent,
    filters.structure,
    filters.size,
    filters.sizeUnit,
    filters.floor,
    filters.options,
    roomType,
    sort,
  ]);

  const similarSearchParams = useMemo<RoomSearchParams>(
    () => ({
      search: "",
      transactionType: filters.transactionType,
      roomType: roomType === "oneroom" ? "원룸" : "투룸",
      structure: roomType === "oneroom" ? filters.structure : [],
      deposit: filters.deposit,
      monthlyRent: filters.monthlyRent,
      size: filters.size,
      sizeUnit: filters.sizeUnit,
      floor: filters.floor,
      options: filters.options,
      sort,
      lat: canFindSimilarRooms ? mapBounds?.centerLat : undefined,
      lng: canFindSimilarRooms ? mapBounds?.centerLng : undefined,
      swLat: canFindSimilarRooms ? mapBounds?.swLat : undefined,
      swLng: canFindSimilarRooms ? mapBounds?.swLng : undefined,
      neLat: canFindSimilarRooms ? mapBounds?.neLat : undefined,
      neLng: canFindSimilarRooms ? mapBounds?.neLng : undefined,
      level: mapBounds?.level,
    }),
    [
      filters.transactionType,
      filters.deposit,
      filters.monthlyRent,
      filters.structure,
      filters.size,
      filters.sizeUnit,
      filters.floor,
      filters.options,
      roomType,
      sort,
      canFindSimilarRooms,
      mapBounds?.centerLat,
      mapBounds?.centerLng,
      mapBounds?.swLat,
      mapBounds?.swLng,
      mapBounds?.neLat,
      mapBounds?.neLng,
      mapBounds?.level,
    ],
  );

  const handleFindSimilarBlocked = useCallback(() => {
    showToast("지역을 검색하거나, 지도를 확대해주세요", "info");
  }, [showToast]);

  useEffect(() => {
    if (searchQuery.trim()) return;
    setMapSearchQuery("");
  }, [searchQuery]);

  const handleSearchSubmit = useCallback((query: string) => {
    setMapSearchQuery(query.trim());
  }, []);

  const prevRequestKeyRef = useRef<string>("");
  const prevSimilarRequestKeyRef = useRef<string>("");
  const activeListRequestKeyRef = useRef<string>("");

  const getSimilarRequestKey = useCallback(
    (imageUrl: string) =>
      JSON.stringify({
        imageUrl,
        body: buildSearchBody({
          ...similarSearchParams,
          offset: 0,
          limit: 4,
        }),
      }),
    [similarSearchParams],
  );

  const handleSimilarListingsFound = useCallback(
    (similar: Listing[], imageUrl?: string) => {
      const topSimilar = similar.slice(0, 4);
      if (imageUrl) {
        setSimilarImageUrl(imageUrl);
        prevSimilarRequestKeyRef.current = getSimilarRequestKey(imageUrl);
      }
      setRecommendedListings(topSimilar);
      setSelectedListing(topSimilar[0] ?? null);
      setIsDetailOpen(false);
    },
    [getSimilarRequestKey],
  );

  const handleFindSimilarFromPhoto = useCallback(
    async (imageUrl: string, listingId: number, imageId?: number) => {
      if (!canFindSimilarRooms) {
        handleFindSimilarBlocked();
        return;
      }

      setIsFindingPhotoSimilar(true);

      try {
        const response = await fetch("/api/find-similar-rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...buildSearchBody({
              ...similarSearchParams,
              offset: 0,
              limit: 3,
              excludeItemId: listingId,
            }),
            image_url: imageUrl,
            user_id: user?.user_id ?? null,
            source_image_id: imageId ?? null,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Similar room request failed (${response.status}): ${errorText}`,
          );
        }

        const data = await response.json();
        if (typeof data.remain === "number" || typeof data.credit === "number") {
          updateUser({
            remain: typeof data.remain === "number" ? data.remain : user?.remain,
            credit: typeof data.credit === "number" ? data.credit : user?.credit,
          });
        }
        const similar = Array.isArray(data.items)
          ? data.items.map(mapSimilarItemToListing).slice(0, 3)
          : [];

        logSimilarRoomScores(similar, "listing photo search");
        setPhotoSimilarListings(similar);

        if (similar.length === 0) {
          showToast("비슷한 매물을 찾지 못했습니다.", "info");
        }
      } catch (error) {
        console.error(error);
        showToast("유사 매물 검색에 실패했습니다.", "info");
      } finally {
        setIsFindingPhotoSimilar(false);
      }
    },
    [
      canFindSimilarRooms,
      handleFindSimilarBlocked,
      similarSearchParams,
      showToast,
      updateUser,
      user?.credit,
      user?.remain,
      user?.user_id,
    ],
  );

  useEffect(() => {
    if (prevRequestKeyRef.current === requestKey) return;
    prevRequestKeyRef.current = requestKey;
    if (!similarImageUrl) {
      setRecommendedListings(null);
    }
    setListings([]);
    setMapItems([]);
    setVisibleListings([]);
    setListScrollResetKey((prev) => prev + 1);
    if (!isPendingOpenRef.current) {
      setSelectedListing(null);
      setIsDetailOpen(false);
    }
    setOffset(0);
    setHasMore(true);
    setHasRequestFailed(false);
    setIsInitialLoading(false);
  }, [requestKey, similarImageUrl]);

  useEffect(() => {
    if (!similarImageUrl) return;
    if (!canFindSimilarRooms) return;
    if (mapBounds?.source === "user" || mapBounds?.source === "selection")
      return;

    const nextSimilarRequestKey = getSimilarRequestKey(similarImageUrl);
    if (prevSimilarRequestKeyRef.current === nextSimilarRequestKey) return;
    prevSimilarRequestKeyRef.current = nextSimilarRequestKey;

    const controller = new AbortController();

    const refreshSimilarListings = async () => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/find-similar-rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...buildSearchBody({
              ...similarSearchParams,
              offset: 0,
              limit: 4,
            }),
            image_url: similarImageUrl,
            user_id: user?.user_id ?? null,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Similar room request failed.");
        }

        const data = await response.json();
        if (typeof data.remain === "number" || typeof data.credit === "number") {
          updateUser({
            remain: typeof data.remain === "number" ? data.remain : user?.remain,
            credit: typeof data.credit === "number" ? data.credit : user?.credit,
          });
        }
        const similar = Array.isArray(data.items)
          ? data.items.map(mapSimilarItemToListing).slice(0, 4)
          : [];
        logSimilarRoomScores(similar, "filter refresh");
        setRecommendedListings(similar);
        setSelectedListing(similar[0] ?? null);
        setIsDetailOpen(false);
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return;
        console.error(error);
      } finally {
        if (controller.signal.aborted) return;
        setIsLoading(false);
        setIsInitialLoading(false);
      }
    };

    refreshSimilarListings();
    return () => {
      controller.abort();
    };
  }, [
    canFindSimilarRooms,
    getSimilarRequestKey,
    mapBounds?.source,
    similarImageUrl,
    similarSearchParams,
    updateUser,
    user?.credit,
    user?.remain,
    user?.user_id,
  ]);

  const handleInitialLocationResolved = useCallback(() => {
    setIsLocationReady((prev) => (prev ? prev : true));
  }, []);

  const handleBoundsChange = useCallback((nextBounds: MapBounds) => {
    const normalizedBounds = normalizeBounds(nextBounds);

    if (boundsDebounceTimerRef.current) {
      clearTimeout(boundsDebounceTimerRef.current);
      boundsDebounceTimerRef.current = null;
    }

    const applyBounds = () => {
      setMapBounds((prev) => {
        if (isSameBounds(prev, normalizedBounds)) return prev;
        return normalizedBounds;
      });
    };

    if (normalizedBounds.source === "user") {
      boundsDebounceTimerRef.current = setTimeout(
        applyBounds,
        MAP_BOUNDS_DEBOUNCE_MS,
      );
      return;
    }

    applyBounds();
  }, []);

  const handleVisibleListingsChange = useCallback((nextListings: Listing[]) => {
    setVisibleListings(nextListings);
  }, []);

  useEffect(() => {
    return () => {
      if (boundsDebounceTimerRef.current) {
        clearTimeout(boundsDebounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedListing) return;
    if (isPendingOpenRef.current) return; // pending으로 열린 매물은 스킵
    const stillExistsInPanel =
      panelListings.some((listing) => listing.id === selectedListing.id) ||
      (recommendedListings ?? []).some(
        (listing) => listing.id === selectedListing.id,
      ) ||
      photoSimilarListings.some(
        (listing) => listing.id === selectedListing.id,
      ) ||
      favoriteListings.some((listing) => listing.id === selectedListing.id);
    if (!stillExistsInPanel) {
      setSelectedListing(null);
      setIsDetailOpen(false);
    }
  }, [
    panelListings,
    recommendedListings,
    photoSimilarListings,
    favoriteListings,
    selectedListing,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    const loadPagedItems = async () => {
      if (!isLocationReady || !mapBounds) return;
      const isFilterReload = activeListRequestKeyRef.current !== requestKey;
      if (!shouldReloadByBounds(mapBounds.source) && !isFilterReload) return;
      if (activeListRequestKeyRef.current !== requestKey && offset !== 0) return;
      if (offset > 0 && (!hasMore || hasRequestFailed)) return;

      if (offset === 0) {
        activeListRequestKeyRef.current = requestKey;
      }

      setIsLoading(true);

      try {
        const data = await fetchItems({
          offset,
          limit: PAGE_SIZE,
          search: "",
          transactionType: filters.transactionType,
          roomType: roomType === "oneroom" ? "원룸" : "투룸",
          structure: roomType === "oneroom" ? filters.structure : [],
          deposit: filters.deposit,
          monthlyRent: filters.monthlyRent,
          size: filters.size,
          sizeUnit: filters.sizeUnit,
          floor: filters.floor,
          options: filters.options,
          sort,
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
        if (offset === 0) {
          setListScrollResetKey((prev) => prev + 1);
        }
        setHasMore(data.has_more);
        setHasRequestFailed(false);
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return;
        console.error(error);
        setHasRequestFailed(true);
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
    filters.transactionType,
    filters.deposit,
    filters.monthlyRent,
    filters.structure,
    filters.size,
    filters.sizeUnit,
    filters.floor,
    filters.options,
    roomType,
    sort,
    hasMore,
    hasRequestFailed,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    const loadMapItems = async () => {
      if (!isLocationReady || !mapBounds) return;
      if (!shouldReloadByBounds(mapBounds.source)) return;

      try {
        const data = await fetchMapItems({
          search: "",
          transactionType: filters.transactionType,
          roomType: roomType === "oneroom" ? "원룸" : "투룸",
          structure: roomType === "oneroom" ? filters.structure : [],
          deposit: filters.deposit,
          monthlyRent: filters.monthlyRent,
          size: filters.size,
          sizeUnit: filters.sizeUnit,
          floor: filters.floor,
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
        if (controller.signal.aborted || isAbortError(error)) return;
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
    filters.transactionType,
    filters.deposit,
    filters.monthlyRent,
    filters.structure,
    filters.size,
    filters.sizeUnit,
    filters.floor,
    filters.options,
    roomType,
    sort,
  ]);

  const prevBoundsRef = useRef<MapBounds | null>(null);

  useEffect(() => {
    if (!mapBounds) return;
    const prevBounds = prevBoundsRef.current;
    prevBoundsRef.current = mapBounds;
    if (!prevBounds) return;
    if (isSameBounds(prevBounds, mapBounds)) return;
    if (!shouldReloadByBounds(mapBounds.source)) return;
    setOffset(0);
    setHasMore(true);
    setIsInitialLoading(false);
    setHasRequestFailed(false);
  }, [mapBounds]);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    setOffset((prev) => prev + PAGE_SIZE);
  }, [hasMore, isLoading]);

  // 매물목록 클릭 → 지도 이동 + 상세패널 오픈
  const handleListingClick = useCallback(
    (listing: Listing) => {
      recordRecentListing(listing);
      setSelectedListing(listing);
      setIsDetailOpen(true);
    },
    [recordRecentListing],
  );

  // 찜목록 클릭 → 지도 이동 + 상세패널 오픈 (매물목록과 동일)
  const handleWishClick = useCallback(
    (listing: Listing) => {
      recordRecentListing(listing);
      setSelectedListing(listing);
      setIsDetailOpen(true);
    },
    [recordRecentListing],
  );

  const handleSimilarOverlayListingClick = useCallback(
    (listing: Listing) => {
      const lat = Number(listing.lat);
      const lng = Number(listing.lng);

      recordRecentListing(listing);
      setSelectedListing(listing);
      setIsPanelOpen(true);
      setIsDetailOpen(true);
      setListings([]);
      setMapItems([]);
      setVisibleListings([]);
      setOffset(0);
      setHasMore(true);
      setHasRequestFailed(false);
      setListScrollResetKey((prev) => prev + 1);

      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        mapFocusRequestIdRef.current += 1;
        setMapFocusRequest({
          id: mapFocusRequestIdRef.current,
          lat,
          lng,
          level: 2,
          source: "search",
        });
      }
    },
    [recordRecentListing],
  );

  // favoriteIds DB에서 로드
  useEffect(() => {
    if (!isLoggedIn || !user?.user_id) {
      setFavoriteIds([]);
      return;
    }

    const controller = new AbortController();
    const loadFavorites = async () => {
      try {
        const data = await fetchFavorites(user.user_id!, controller.signal);
        setFavoriteIds(data.items.map((item) => item.item_id));
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setFavoriteIds([]);
      }
    };

    loadFavorites();
    return () => controller.abort();
  }, [isLoggedIn, user?.user_id]);

  // favoriteListings DB에서 로드 — listings와 완전히 분리, 지도 이동해도 유지
  const [hasLoadedFavoriteListings, setHasLoadedFavoriteListings] =
    useState(false);

  useEffect(() => {
    if (isLoggedIn && user?.user_id) return;
    setFavoriteListings([]);
    setHasLoadedFavoriteListings(false);
  }, [isLoggedIn, user?.user_id]);

  const loadFavoriteListings = useCallback(async () => {
    if (!isLoggedIn || !user?.user_id || hasLoadedFavoriteListings) return;

    try {
      const data = await fetchFavorites(user.user_id);
      const ids = data.items.map((item) => item.item_id);

      const details = await Promise.all(
        ids.map((id) =>
          fetchRoomDetail(id)
            .then((d) => mapItemToListing(d.item))
            .catch(() => null),
        ),
      );

      setFavoriteListings(details.filter(Boolean) as Listing[]);
      setHasLoadedFavoriteListings(true);
    } catch (error) {
      console.error(error);
    }
  }, [hasLoadedFavoriteListings, isLoggedIn, user?.user_id]);

  const handleToggleFavorite = useCallback(
    async (listingId: number) => {
      if (!isLoggedIn || !user?.user_id) {
        setIsLoginGuideOpen(true);
        return;
      }

      if (favoriteLoadingIds.includes(listingId)) return;

      const isFavorite = favoriteIds.includes(listingId);
      setFavoriteLoadingIds((prev) => [...prev, listingId]);

      try {
        if (isFavorite) {
          await removeFavorite(listingId, user.user_id);
          setFavoriteIds((prev) => prev.filter((id) => id !== listingId));
          setFavoriteListings((prev) =>
            prev.filter((l) => Number(l.id) !== listingId),
          );
          showToast("찜 목록에서 삭제되었습니다.", "remove");
        } else {
          await addFavorite(listingId, user.user_id);
          setFavoriteIds((prev) => [...prev, listingId]);
          const newListing = listings.find((l) => Number(l.id) === listingId);
          if (newListing) {
            setFavoriteListings((prev) => [...prev, newListing]);
          }
          showToast("찜 목록에 추가되었습니다.", "add");
        }
      } catch (error) {
        console.error(error);
        alert("즐겨찾기 처리 중 오류가 발생했습니다.");
      } finally {
        setFavoriteLoadingIds((prev) => prev.filter((id) => id !== listingId));
      }
    },
    [
      favoriteIds,
      favoriteLoadingIds,
      isLoggedIn,
      user?.user_id,
      listings,
      showToast,
    ],
  );

  const openLoginGuide = useCallback(() => {
    setIsLoginGuideOpen(true);
  }, []);

  const handleLoginRedirect = useCallback(() => {
    setIsLoginGuideOpen(false);
    router.push("/login");
  }, [router]);

  const handleRoomTypeChange = useCallback(
    (nextRoomType: "oneroom" | "tworoom") => {
      setRoomType(nextRoomType);
      setFilters((prev) => {
        const maxDeposit = getMaxDepositByRoomType(nextRoomType);
        const maxSize = getMaxSizeByRoomType(nextRoomType, prev.sizeUnit);
        const nextDeposit =
          prev.deposit !== "all" && prev.deposit > maxDeposit
            ? maxDeposit
            : prev.deposit;
        const nextSize =
          prev.size !== "all" && Number(prev.size) > maxSize
            ? maxSize
            : prev.size;
        const nextStructure =
          nextRoomType === "tworoom" && prev.structure.length > 0
            ? []
            : prev.structure;

        if (
          prev.deposit === nextDeposit &&
          prev.size === nextSize &&
          prev.structure === nextStructure
        ) {
          return prev;
        }

        return {
          ...prev,
          deposit: nextDeposit,
          size: nextSize,
          structure: nextStructure,
        };
      });
    },
    [],
  );

  return (
    <>
      <OnboardingGuide userId={user?.user_id} />

      {/* 찜 토스트 알림 */}
      <Toast toast={toast} onClose={hideToast} />

      {isLoginGuideOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-guide-title"
          aria-describedby="login-guide-description"
          onClick={() => setIsLoginGuideOpen(false)}
        >
          <div
            className="w-full max-w-[380px] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 pt-7 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <LogIn className="h-5 w-5" />
              </div>
              <h2
                id="login-guide-title"
                className="text-xl font-bold tracking-normal text-stone-900"
              >
                로그인이 필요해요
              </h2>
              <p
                id="login-guide-description"
                className="mt-2 text-sm leading-6 text-stone-500"
              >
                마음에 드는 매물을 찜하려면 먼저 로그인해 주세요.
              </p>
            </div>
            <div className="flex flex-col gap-2 px-6 pb-6 pt-5">
              <button
                type="button"
                onClick={handleLoginRedirect}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-800"
              >
                로그인하러 가기
              </button>
              <button
                type="button"
                onClick={() => setIsLoginGuideOpen(false)}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
              >
                계속 둘러보기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 이미지 풀스크린 모달 */}
      {aiFullscreenUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85"
          onClick={() => setAiFullscreenUrl(null)}
        >
          <div
            className="relative w-[480px] max-w-[90vw] overflow-hidden rounded-2xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-square w-full">
              <Image
                src={aiFullscreenUrl}
                alt="AI 생성 이미지"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => setAiFullscreenUrl(null)}
              className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 풀스크린 사진 모달 — 페이지 최상단 */}
      {isFullscreen && fullscreenImages.length > 0 && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-white/70">
              {fullscreenIndex + 1} / {fullscreenImages.length}
            </span>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center">
            <Image
              src={fullscreenImages[fullscreenIndex]}
              alt={`사진 ${fullscreenIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
            {fullscreenImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setFullscreenIndex(
                      (prev) =>
                        (prev - 1 + fullscreenImages.length) %
                        fullscreenImages.length,
                    )
                  }
                  className="absolute left-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
                  aria-label="이전 사진"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M10 3L5.5 8L10 13"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFullscreenIndex(
                      (prev) => (prev + 1) % fullscreenImages.length,
                    )
                  }
                  className="absolute right-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
                  aria-label="다음 사진"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M6 3L10.5 8L6 13"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>
          {fullscreenImages.length > 1 && (
            <div className="flex justify-center gap-1.5 py-4">
              {fullscreenImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFullscreenIndex(i)}
                  className={`h-1.5 cursor-pointer rounded-full transition-all duration-200 ${
                    i === fullscreenIndex ? "w-5 bg-white" : "w-1.5 bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex h-screen flex-col bg-ivory">
        <Header roomType={roomType} onRoomTypeChange={handleRoomTypeChange} />

        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          roomType={roomType}
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
              searchQuery={mapSearchQuery}
              mapItems={mapItems}
              selectedListing={selectedListing}
              focusRequest={mapFocusRequest}
              onMarkerClick={(listing) => {
                recordRecentListing(listing);
                setSelectedListing(listing);
                setIsDetailOpen(true);
              }}
              onVisibleListingsChange={handleVisibleListingsChange}
              onInitialLocationResolved={handleInitialLocationResolved}
              onBoundsChange={handleBoundsChange}
            />
          </section>

          <SimilarListingsOverlay
            listings={photoSimilarListings}
            isPanelOpen={isPanelOpen}
            onClose={() => setPhotoSimilarListings([])}
            onListingClick={handleSimilarOverlayListingClick}
          />

          {/* 패널 토글 버튼 — 항상 표시 */}
          <button
            type="button"
            onClick={() => {
              if (isPanelOpen) {
                setIsPanelOpen(false);
                setIsDetailOpen(false);
                setSelectedListing(null);
                isPendingOpenRef.current = false;
              } else {
                setIsPanelOpen(true);
              }
            }}
            className={`absolute top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white shadow-md transition-all duration-500 ease-in-out hover:bg-stone-50 hover:shadow-lg cursor-pointer ${
              isPanelOpen ? "right-[382px] xl:right-[432px]" : "right-4"
            }`}
            aria-label={isPanelOpen ? "매물 패널 닫기" : "매물 패널 열기"}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              {isPanelOpen ? (
                <path
                  d="M5 2.5L9.5 7L5 11.5"
                  stroke="#444"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <path
                  d="M9 2.5L4.5 7L9 11.5"
                  stroke="#444"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </button>

          {/* 목록 패널 */}
          <aside
            className={`absolute top-0 right-0 z-20 h-full border-l border-border-warm bg-ivory/95 shadow-xl backdrop-blur-sm transition-transform duration-500 ease-in-out w-[400px] xl:w-[450px] ${
              isPanelOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <ListingPanel
              listings={panelListings}
              selectedListing={selectedListing}
              isLoading={isLoading}
              hasMore={hasMore}
              scrollResetKey={listScrollResetKey}
              onLoadMore={loadMore}
              onListingClick={handleListingClick}
              favoriteIds={favoriteIds}
              favoriteLoadingIds={favoriteLoadingIds}
              onToggleFavorite={handleToggleFavorite}
              onSimilarListingsFound={handleSimilarListingsFound}
              aiRecommendedListings={recommendedListings ?? []}
              favoriteListings={favoriteListings}
              onWishTabOpen={loadFavoriteListings}
              isLoggedIn={isLoggedIn}
              onLoginRequired={openLoginGuide}
              onWishClick={handleWishClick}
              sort={sort}
              onSortChange={setSort}
              onAIPhotoClick={(url) => setAiFullscreenUrl(url)}
              similarSearchParams={similarSearchParams}
              canFindSimilarRooms={canFindSimilarRooms}
              onFindSimilarBlocked={handleFindSimilarBlocked}
            />

            {/* 상세 패널 — 목록 위에 슬라이드로 덮음 */}
            <div
              className={`absolute inset-0 z-10 transition-transform duration-300 ease-in-out ${
                isDetailOpen && selectedListing
                  ? "translate-x-0 pointer-events-auto"
                  : "translate-x-full pointer-events-none"
              }`}
            >
              <ListingDetailPanel
                listing={selectedListing}
                isOpen={isDetailOpen && !!selectedListing}
                onClose={() => {
                  // X 버튼 → 목록으로 복귀 (① 상태)
                  setIsDetailOpen(false);
                  setSelectedListing(null);
                  isPendingOpenRef.current = false;
                  setIsInitialLoading(false);
                  setIsLocationReady(true);
                }}
                listPanelOpen={isPanelOpen}
                favoriteIds={favoriteIds}
                favoriteLoadingIds={favoriteLoadingIds}
                onToggleFavorite={handleToggleFavorite}
                onPhotoClick={(images, index) => {
                  setFullscreenImages(images);
                  setFullscreenIndex(index);
                  setIsFullscreen(true);
                }}
                onFindSimilarFromPhoto={handleFindSimilarFromPhoto}
                isFindingSimilarFromPhoto={isFindingPhotoSimilar}
              />
            </div>
          </aside>
        </main>

        <main className="flex flex-1 overflow-hidden lg:hidden">
          {mobileView === "map" ? (
            <section className="relative flex-1">
              <MapView
                searchQuery={mapSearchQuery}
                mapItems={mapItems}
                selectedListing={selectedListing}
                focusRequest={mapFocusRequest}
                onMarkerClick={(listing) => {
                  recordRecentListing(listing);
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
                hasMore={hasMore}
                scrollResetKey={listScrollResetKey}
                onLoadMore={loadMore}
                onListingClick={handleListingClick}
                favoriteIds={favoriteIds}
                favoriteLoadingIds={favoriteLoadingIds}
                onToggleFavorite={handleToggleFavorite}
                onSimilarListingsFound={handleSimilarListingsFound}
                aiRecommendedListings={recommendedListings ?? []}
                favoriteListings={favoriteListings}
                onWishTabOpen={loadFavoriteListings}
                isLoggedIn={isLoggedIn}
                onLoginRequired={openLoginGuide}
                onWishClick={handleWishClick}
                onAIPhotoClick={(url) => setAiFullscreenUrl(url)}
                similarSearchParams={similarSearchParams}
                canFindSimilarRooms={canFindSimilarRooms}
                onFindSimilarBlocked={handleFindSimilarBlocked}
              />
            </aside>
          )}
        </main>

        {(!isLocationReady ||
          (isInitialLoading && listings.length === 0 && !selectedListing)) &&
          !isPendingOpenRef.current && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/10">
              <div className="rounded-lg bg-white px-4 py-3 shadow-md">
                현재 위치 기준 매물 불러오는 중...
              </div>
            </div>
          )}
      </div>
    </>
  );
}
