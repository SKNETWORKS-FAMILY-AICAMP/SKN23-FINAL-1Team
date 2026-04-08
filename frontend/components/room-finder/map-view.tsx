"use client";

import { useEffect, useRef, useState } from "react";

interface MapViewProps {
  searchQuery: string;
  listings: Listing[];
  onMarkerClick?: (listing: Listing) => void;
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
  onMarkerClick,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowsRef = useRef<any[]>([]);
  const currentLocationMarkerRef = useRef<any>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const clearMarkers = () => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    infoWindowsRef.current.forEach((infoWindow) => infoWindow.close());
    infoWindowsRef.current = [];
  };

  const createListingMarkers = (map: any, kakao: any) => {
    clearMarkers();

    if (!listings.length) return;

    const bounds = new kakao.maps.LatLngBounds();

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
      bounds.extend(position);
    });

    if (markersRef.current.length === 1) {
      map.setCenter(bounds.getSouthWest());
      map.setLevel(3);
    } else if (markersRef.current.length > 1) {
      map.setBounds(bounds);
    }
  };

  const moveToCurrentLocation = (map: any, kakao: any) => {
    if (!navigator.geolocation) {
      const fallback = new kakao.maps.LatLng(
        DEFAULT_CENTER.lat,
        DEFAULT_CENTER.lng,
      );
      map.setCenter(fallback);
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
      },
      () => {
        const fallback = new kakao.maps.LatLng(
          DEFAULT_CENTER.lat,
          DEFAULT_CENTER.lng,
        );
        map.setCenter(fallback);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
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
    });
  };

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const initializeMap = () => {
      if (!mapRef.current) return;

      if (!window.kakao || !window.kakao.maps) {
        retryTimer = setTimeout(initializeMap, 200);
        return;
      }

      window.kakao.maps.load(() => {
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

        if (!hasInitialized) {
          moveToCurrentLocation(map, kakao);
          setHasInitialized(true);
        }

        if (listings.length > 0) {
          createListingMarkers(map, kakao);
        }
      });
    };

    initializeMap();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [hasInitialized, listings, onMarkerClick]);

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !window.kakao) return;

    const map = mapInstanceRef.current;
    const kakao = window.kakao;

    setTimeout(() => {
      map.relayout();
    }, 0);

    if (searchQuery.trim()) {
      moveToKeyword(map, kakao, searchQuery);
    }
  }, [searchQuery, isMapReady]);

  useEffect(() => {
    const handleResize = () => {
      if (!mapInstanceRef.current) return;
      mapInstanceRef.current.relayout();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {!isMapReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
          <div className="text-sm text-gray-500">지도 로딩 중...</div>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full min-h-[400px]" />

      {searchQuery && (
        <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-linen/90 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-lg shadow-md z-10">
          <span className="text-xs md:text-sm font-medium text-neutral-dark">
            {searchQuery}
          </span>
        </div>
      )}
    </div>
  );
}
