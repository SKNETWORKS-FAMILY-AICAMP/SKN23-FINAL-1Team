"use client";

import { useEffect, useRef, useState } from "react";

export interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
  centerLat: number;
  centerLng: number;
  level: number;
  source: "initial" | "user" | "cluster" | "search" | "selection";
}

export interface Listing {
  id: string;
  title: string;
  price: string;
  deposit: string;
  monthlyRent: string;
  address: string;
  size: string;
  floor: string;
  images: string[];
  lat: number;
  lng: number;
  structure: string;
  options: string[];
}

export interface ClusterMapItem {
  type: "cluster";
  id: string;
  lat: number;
  lng: number;
  count: number;
}

export interface MarkerMapItem {
  type: "marker";
  id: string;
  item_id: number;
  title: string;
  price: string;
  deposit: string;
  monthlyRent: string;
  address: string;
  size: string;
  floor: string;
  images: string[];
  lat: number;
  lng: number;
  structure: string;
  options: string[];
}

export type MapItem = ClusterMapItem | MarkerMapItem;

interface MapViewProps {
  searchQuery: string;
  mapItems: MapItem[];
  selectedListing?: Listing | null;
  onMarkerClick?: (listing: Listing) => void;
  onVisibleListingsChange?: (listings: Listing[]) => void;
  onInitialLocationResolved?: (coords: { lat: number; lng: number }) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
}

declare global {
  interface Window {
    kakao: any;
  }
}

const DEFAULT_CENTER = {
  lat: 37.5665,
  lng: 126.978,
};

const BOUNDS_PRECISION = 5;

function roundBoundsValue(value: number) {
  return Number(value.toFixed(BOUNDS_PRECISION));
}

function boundsToKey(bounds: MapBounds) {
  return [
    roundBoundsValue(bounds.swLat),
    roundBoundsValue(bounds.swLng),
    roundBoundsValue(bounds.neLat),
    roundBoundsValue(bounds.neLng),
    roundBoundsValue(bounds.centerLat),
    roundBoundsValue(bounds.centerLng),
    bounds.level,
  ].join(",");
}

function isMarkerItem(item: MapItem): item is MarkerMapItem {
  return item.type === "marker";
}

function mapMarkerItemToListing(item: MarkerMapItem): Listing {
  return {
    id: String(item.item_id ?? item.id),
    title: item.title,
    price: item.price,
    deposit: item.deposit,
    monthlyRent: item.monthlyRent,
    address: item.address,
    size: item.size,
    floor: item.floor,
    images: item.images ?? [],
    lat: Number(item.lat),
    lng: Number(item.lng),
    structure: item.structure,
    options: item.options ?? [],
  };
}

export function MapView({
  searchQuery,
  mapItems,
  selectedListing,
  onMarkerClick,
  onVisibleListingsChange,
  onInitialLocationResolved,
  onBoundsChange,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const mapObjectsRef = useRef<any[]>([]);
  const infoWindowsRef = useRef<any[]>([]);
  const mapItemsRef = useRef<MapItem[]>([]);

  const visibleListingIdsRef = useRef<string>("");
  const lastAppliedSearchRef = useRef<string>("");
  const hasMovedToCurrentLocationRef = useRef(false);
  const lastBoundsKeyRef = useRef<string>("");
  const selectedListingRef = useRef<Listing | null>(selectedListing ?? null);

  const pendingSourceRef = useRef<MapBounds["source"]>("initial");

  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    selectedListingRef.current = selectedListing ?? null;
  }, [selectedListing]);

  const getListingCoords = (listing: Listing | null) => {
    if (!listing) return null;

    const lat = Number(listing.lat);
    const lng = Number(listing.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return { lat, lng };
  };

  const clearMapObjects = () => {
    mapObjectsRef.current.forEach((object) => {
      if (typeof object.setMap === "function") {
        object.setMap(null);
      }
    });
    mapObjectsRef.current = [];

    infoWindowsRef.current.forEach((infoWindow) => infoWindow.close());
    infoWindowsRef.current = [];
  };

  const emitBounds = (map: any) => {
    if (!window.kakao) return;

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const center = map.getCenter();

    const source = pendingSourceRef.current;
    pendingSourceRef.current = "user";

    const nextBounds: MapBounds = {
      swLat: roundBoundsValue(sw.getLat()),
      swLng: roundBoundsValue(sw.getLng()),
      neLat: roundBoundsValue(ne.getLat()),
      neLng: roundBoundsValue(ne.getLng()),
      centerLat: roundBoundsValue(center.getLat()),
      centerLng: roundBoundsValue(center.getLng()),
      level: typeof map.getLevel === "function" ? map.getLevel() : 4,
      source,
    };

    const nextKey = boundsToKey(nextBounds);

    if (lastBoundsKeyRef.current === nextKey) return;
    lastBoundsKeyRef.current = nextKey;

    onBoundsChange?.(nextBounds);
  };

  const updateVisibleListings = (map: any, kakao: any) => {
    if (!map) return;

    const markerItems = mapItemsRef.current.filter(isMarkerItem);

    if (!markerItems.length) {
      if (visibleListingIdsRef.current !== "") {
        visibleListingIdsRef.current = "";
        onVisibleListingsChange?.([]);
      }
      return;
    }

    const bounds = map.getBounds();

    const visible = markerItems
      .filter((item) => {
        const lat = Number(item.lat);
        const lng = Number(item.lng);

        if (Number.isNaN(lat) || Number.isNaN(lng)) return false;

        const position = new kakao.maps.LatLng(lat, lng);
        return bounds.contain(position);
      })
      .map(mapMarkerItemToListing);

    const nextIds = visible.map((listing) => listing.id).join(",");

    if (visibleListingIdsRef.current === nextIds) return;

    visibleListingIdsRef.current = nextIds;
    onVisibleListingsChange?.(visible);
  };

  const createClusterOverlay = (map: any, kakao: any, item: ClusterMapItem) => {
    const position = new kakao.maps.LatLng(Number(item.lat), Number(item.lng));

    const sizeClass =
      item.count >= 1000
        ? "width:64px;height:64px;font-size:15px;"
        : item.count >= 100
          ? "width:56px;height:56px;font-size:14px;"
          : "width:48px;height:48px;font-size:13px;";

    const content = document.createElement("div");
    content.innerHTML = `
      <div
        style="
          ${sizeClass}
          display:flex;
          align-items:center;
          justify-content:center;
          border-radius:9999px;
          background:rgba(74, 124, 111, 0.92);
          color:white;
          font-weight:700;
          box-shadow:0 10px 24px rgba(15,23,42,0.18);
          border:3px solid rgba(255,255,255,0.95);
          cursor:pointer;
          user-select:none;
        "
      >
        ${item.count}
      </div>
    `;

    const overlay = new kakao.maps.CustomOverlay({
      map,
      position,
      content,
      yAnchor: 0.5,
      xAnchor: 0.5,
    });

    content.addEventListener("click", () => {
      const currentLevel =
        typeof map.getLevel === "function" ? map.getLevel() : 4;
      const nextLevel = Math.max(currentLevel - 1, 1);

      pendingSourceRef.current = "cluster";
      map.setLevel(nextLevel, { anchor: position });
      map.panTo(position);
    });

    mapObjectsRef.current.push(overlay);
  };

  const createMarker = (map: any, kakao: any, item: MarkerMapItem) => {
    const lat = Number(item.lat);
    const lng = Number(item.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    const position = new kakao.maps.LatLng(lat, lng);

    const marker = new kakao.maps.Marker({
      map,
      position,
    });

    const infoWindow = new kakao.maps.InfoWindow({
      content: `
        <div style="padding:8px 10px; font-size:12px; min-width:160px; line-height:1.4;">
          <div>${item.price || `${item.deposit}/${item.monthlyRent}`}</div>
          <div style="color:#666; margin-top:2px;">${item.address}</div>
        </div>
      `,
    });

    const listing = mapMarkerItemToListing(item);

    kakao.maps.event.addListener(marker, "click", () => {
      onMarkerClick?.(listing);
    });

    kakao.maps.event.addListener(marker, "mouseover", () => {
      infoWindow.open(map, marker);
    });

    kakao.maps.event.addListener(marker, "mouseout", () => {
      infoWindow.close();
    });

    mapObjectsRef.current.push(marker);
    infoWindowsRef.current.push(infoWindow);
  };

  const createMapObjects = (map: any, kakao: any) => {
    clearMapObjects();

    if (!mapItems.length) {
      if (visibleListingIdsRef.current !== "") {
        visibleListingIdsRef.current = "";
        onVisibleListingsChange?.([]);
      }
      return;
    }

    mapItems.forEach((item) => {
      if (item.type === "cluster") {
        createClusterOverlay(map, kakao, item);
        return;
      }

      createMarker(map, kakao, item);
    });
  };

  const moveToCurrentLocation = (map: any, kakao: any) => {
    return new Promise<{ lat: number; lng: number }>((resolve) => {
      const fallback = {
        lat: DEFAULT_CENTER.lat,
        lng: DEFAULT_CENTER.lng,
      };

      if (!navigator.geolocation) {
        const fallbackPos = new kakao.maps.LatLng(fallback.lat, fallback.lng);
        pendingSourceRef.current = "initial";
        map.setCenter(fallbackPos);
        map.setLevel(4);
        resolve(fallback);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const currentPos = new kakao.maps.LatLng(lat, lng);

          pendingSourceRef.current = "initial";
          map.setCenter(currentPos);
          map.setLevel(4);

          resolve({ lat, lng });
        },
        () => {
          const fallbackPos = new kakao.maps.LatLng(fallback.lat, fallback.lng);
          pendingSourceRef.current = "initial";
          map.setCenter(fallbackPos);
          map.setLevel(4);

          resolve(fallback);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    });
  };

  const moveToKeyword = (map: any, kakao: any, keyword: string) => {
    if (!keyword.trim()) return;

    const places = new kakao.maps.services.Places();

    places.keywordSearch(keyword, (data: any, status: any) => {
      if (status !== kakao.maps.services.Status.OK || !data.length) return;

      const bounds = new kakao.maps.LatLngBounds();

      data.forEach((place: any) => {
        bounds.extend(new kakao.maps.LatLng(Number(place.y), Number(place.x)));
      });

      pendingSourceRef.current = "search";
      map.setBounds(bounds);
      emitBounds(map);
    });
  };

  useEffect(() => {
    mapItemsRef.current = mapItems;
  }, [mapItems]);

  useEffect(() => {
    visibleListingIdsRef.current = "";
  }, [mapItems]);

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const initializeMap = () => {
      if (!mapRef.current || isCancelled) return;

      if (!window.kakao || !window.kakao.maps) {
        retryTimer = setTimeout(initializeMap, 200);
        return;
      }

      window.kakao.maps.load(async () => {
        if (isCancelled) return;

        const kakao = window.kakao;

        if (!mapInstanceRef.current) {
          const center = new kakao.maps.LatLng(
            DEFAULT_CENTER.lat,
            DEFAULT_CENTER.lng,
          );

          mapInstanceRef.current = new kakao.maps.Map(mapRef.current, {
            center,
            level: 4,
          });
        }

        const map = mapInstanceRef.current;

        map.relayout();
        setIsMapReady(true);

        if (!hasMovedToCurrentLocationRef.current) {
          const initialSelectedCoords = getListingCoords(selectedListingRef.current);

          if (initialSelectedCoords) {
            const selectedPos = new kakao.maps.LatLng(
              initialSelectedCoords.lat,
              initialSelectedCoords.lng,
            );

            pendingSourceRef.current = "selection";
            map.setCenter(selectedPos);
            map.setLevel(4);
            hasMovedToCurrentLocationRef.current = true;
            emitBounds(map);
            onInitialLocationResolved?.(initialSelectedCoords);
            return;
          }

          const coords = await moveToCurrentLocation(map, kakao);
          if (isCancelled) return;

          hasMovedToCurrentLocationRef.current = true;
          emitBounds(map);
          onInitialLocationResolved?.(coords);
          return;
        }

        emitBounds(map);
      });
    };

    initializeMap();

    return () => {
      isCancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !window.kakao) return;

    const map = mapInstanceRef.current;
    const kakao = window.kakao;

    createMapObjects(map, kakao);
    updateVisibleListings(map, kakao);
  }, [isMapReady, mapItems, onMarkerClick, onVisibleListingsChange]);

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !window.kakao) return;

    const map = mapInstanceRef.current;
    const kakao = window.kakao;

    const handleIdle = () => {
      updateVisibleListings(map, kakao);
      emitBounds(map);
    };

    kakao.maps.event.addListener(map, "idle", handleIdle);
    handleIdle();

    return () => {
      kakao.maps.event.removeListener(map, "idle", handleIdle);
    };
  }, [isMapReady, onVisibleListingsChange, onBoundsChange]);

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !window.kakao) return;

    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery === lastAppliedSearchRef.current) return;

    lastAppliedSearchRef.current = trimmedQuery;

    if (!trimmedQuery) return;

    const map = mapInstanceRef.current;
    const kakao = window.kakao;

    moveToKeyword(map, kakao, trimmedQuery);
  }, [searchQuery, isMapReady]);

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !window.kakao) return;
    if (!selectedListing) return;

    const lat = Number(selectedListing.lat);
    const lng = Number(selectedListing.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    const map = mapInstanceRef.current;
    const kakao = window.kakao;
    const position = new kakao.maps.LatLng(lat, lng);

    // 선택 이동은 목록 갱신 트리거가 아니어야 함
    pendingSourceRef.current = "selection";
    map.panTo(position);
  }, [selectedListing, isMapReady]);

  useEffect(() => {
    const handleResize = () => {
      if (!mapInstanceRef.current) return;
      mapInstanceRef.current.relayout();
      pendingSourceRef.current = "user";
      emitBounds(mapInstanceRef.current);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [onBoundsChange]);

  return (
    <div className="relative h-full min-h-[400px] w-full">
      {!isMapReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
          <div className="text-sm text-gray-500">지도 로딩 중.</div>
        </div>
      )}

      <div ref={mapRef} className="h-full min-h-[400px] w-full" />

      {searchQuery && (
        <div className="absolute top-2 left-2 z-10 rounded-lg bg-linen/90 px-3 py-1.5 shadow-md backdrop-blur-sm md:top-4 md:left-4 md:px-4 md:py-2">
          <span className="text-xs font-medium text-neutral-dark md:text-sm">
            {searchQuery}
          </span>
        </div>
      )}
    </div>
  );
}
