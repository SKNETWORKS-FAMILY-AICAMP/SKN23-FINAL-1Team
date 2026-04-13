"use client";

import { useEffect, useRef, useState } from "react";

interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
  centerLat: number;
  centerLng: number;
}

interface MapViewProps {
  searchQuery: string;
  listings: Listing[];
  selectedListing?: Listing | null;
  onMarkerClick?: (listing: Listing) => void;
  onVisibleListingsChange?: (listings: Listing[]) => void;
  onInitialLocationResolved?: (coords: { lat: number; lng: number }) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
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

declare global {
  interface Window {
    kakao: any;
  }
}

const DEFAULT_CENTER = {
  lat: 37.5665,
  lng: 126.978,
};

export function MapView({
  searchQuery,
  listings,
  selectedListing,
  onMarkerClick,
  onVisibleListingsChange,
  onInitialLocationResolved,
  onBoundsChange,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowsRef = useRef<any[]>([]);
  const currentLocationMarkerRef = useRef<any>(null);
  const visibleListingIdsRef = useRef<string>("");
  const lastAppliedSearchRef = useRef<string>("");
  const hasMovedToCurrentLocationRef = useRef(false);

  const [isMapReady, setIsMapReady] = useState(false);

  const clearMarkers = () => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    infoWindowsRef.current.forEach((infoWindow) => infoWindow.close());
    infoWindowsRef.current = [];
  };

  const emitBounds = (map: any) => {
    if (!window.kakao) return;

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const center = map.getCenter();

    onBoundsChange?.({
      swLat: sw.getLat(),
      swLng: sw.getLng(),
      neLat: ne.getLat(),
      neLng: ne.getLng(),
      centerLat: center.getLat(),
      centerLng: center.getLng(),
    });
  };

  const updateVisibleListings = (map: any, kakao: any) => {
    if (!map) return;

    const bounds = map.getBounds();

    const visible = listings.filter((listing) => {
      const lat = Number(listing.lat);
      const lng = Number(listing.lng);

      if (Number.isNaN(lat) || Number.isNaN(lng)) return false;

      const position = new kakao.maps.LatLng(lat, lng);
      return bounds.contain(position);
    });

    const nextIds = visible.map((listing) => listing.id).join(",");

    if (visibleListingIdsRef.current === nextIds) return;

    visibleListingIdsRef.current = nextIds;
    onVisibleListingsChange?.(visible);
  };

  const createListingMarkers = (map: any, kakao: any) => {
    clearMarkers();

    if (!listings.length) {
      if (visibleListingIdsRef.current !== "") {
        visibleListingIdsRef.current = "";
        onVisibleListingsChange?.([]);
      }
      return;
    }

    listings.forEach((listing) => {
      const lat = Number(listing.lat);
      const lng = Number(listing.lng);

      if (Number.isNaN(lat) || Number.isNaN(lng)) return;

      const position = new kakao.maps.LatLng(lat, lng);

      const marker = new kakao.maps.Marker({
        map,
        position,
      });

      const infoWindow = new kakao.maps.InfoWindow({
        content: `
          <div style="padding:8px 10px; font-size:12px; min-width:160px; line-height:1.4;">
            <div style="font-weight:700; margin-bottom:4px;">${listing.title}</div>
            <div>${listing.price || `${listing.deposit}/${listing.monthlyRent}`}</div>
            <div style="color:#666; margin-top:2px;">${listing.address}</div>
          </div>
        `,
      });

      kakao.maps.event.addListener(marker, "click", () => {
        onMarkerClick?.(listing);
      });

      kakao.maps.event.addListener(marker, "mouseover", () => {
        infoWindow.open(map, marker);
      });

      kakao.maps.event.addListener(marker, "mouseout", () => {
        infoWindow.close();
      });

      markersRef.current.push(marker);
      infoWindowsRef.current.push(infoWindow);
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
        map.setCenter(fallbackPos);
        map.setLevel(4);

        if (currentLocationMarkerRef.current) {
          currentLocationMarkerRef.current.setMap(null);
        }

        currentLocationMarkerRef.current = new kakao.maps.Marker({
          map,
          position: fallbackPos,
        });

        resolve(fallback);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const currentPos = new kakao.maps.LatLng(lat, lng);

          map.setCenter(currentPos);
          map.setLevel(4);

          if (currentLocationMarkerRef.current) {
            currentLocationMarkerRef.current.setMap(null);
          }

          currentLocationMarkerRef.current = new kakao.maps.Marker({
            map,
            position: currentPos,
          });

          resolve({ lat, lng });
        },
        () => {
          const fallbackPos = new kakao.maps.LatLng(fallback.lat, fallback.lng);
          map.setCenter(fallbackPos);
          map.setLevel(4);

          if (currentLocationMarkerRef.current) {
            currentLocationMarkerRef.current.setMap(null);
          }

          currentLocationMarkerRef.current = new kakao.maps.Marker({
            map,
            position: fallbackPos,
          });

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

      map.setBounds(bounds);
      emitBounds(map);
    });
  };

  useEffect(() => {
    visibleListingIdsRef.current = "";
  }, [listings]);

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const initializeMap = () => {
      if (!mapRef.current) return;

      if (!window.kakao || !window.kakao.maps) {
        retryTimer = setTimeout(initializeMap, 200);
        return;
      }

      window.kakao.maps.load(async () => {
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
          const coords = await moveToCurrentLocation(map, kakao);
          hasMovedToCurrentLocationRef.current = true;
          onInitialLocationResolved?.(coords);
          emitBounds(map);
        } else {
          emitBounds(map);
        }
      });
    };

    initializeMap();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [onInitialLocationResolved, onBoundsChange]);

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !window.kakao) return;

    const map = mapInstanceRef.current;
    const kakao = window.kakao;

    createListingMarkers(map, kakao);
    updateVisibleListings(map, kakao);
  }, [isMapReady, listings, onMarkerClick, onVisibleListingsChange]);

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
  }, [isMapReady, listings, onVisibleListingsChange, onBoundsChange]);

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

    map.panTo(position);

    if (typeof map.getLevel === "function" && map.getLevel() > 4) {
      map.setLevel(4);
    }
  }, [selectedListing, isMapReady]);

  useEffect(() => {
    const handleResize = () => {
      if (!mapInstanceRef.current) return;
      mapInstanceRef.current.relayout();
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
          <div className="text-sm text-gray-500">지도 로딩 중...</div>
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
