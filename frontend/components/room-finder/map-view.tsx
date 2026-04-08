"use client"

import { useEffect, useRef, useState } from "react"

interface MapViewProps {
  searchQuery: string
  listings: Listing[]
  onMarkerClick?: (listing: Listing) => void
}

export interface Listing {
  id: string
  title: string
  price: string
  deposit: string
  monthlyRent: string
  address: string
  size: string
  floor: string
  images: string[]
  lat: number
  lng: number
  structure: string
  options: string[]
}

export function MapView({ searchQuery, listings, onMarkerClick }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMapLoaded(true), 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div ref={mapRef} className="relative w-full h-full bg-gray-100">
      {!mapLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse text-neutral-muted text-sm md:text-base">지도 로딩 중...</div>
        </div>
      ) : (
        <div className="absolute inset-0">
          <div 
            className="w-full h-full bg-cover bg-center bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27400%27%20height%3D%27400%27%20viewBox%3D%270%200%20400%20400%27%3E%3Crect%20fill%3D%27%23e8e8e8%27%20width%3D%27400%27%20height%3D%27400%27%2F%3E%3Cg%20fill%3D%27%23d0d0d0%27%3E%3Crect%20x%3D%270%27%20y%3D%270%27%20width%3D%27200%27%20height%3D%27200%27%2F%3E%3Crect%20x%3D%27200%27%20y%3D%27200%27%20width%3D%27200%27%20height%3D%27200%27%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%27200%27%20y%3D%27200%27%20font-family%3D%27Arial%27%20font-size%3D%2720%27%20fill%3D%27%23999%27%20text-anchor%3D%27middle%27%20dominant-baseline%3D%27middle%27%3E%EC%A7%80%EB%8F%84%20%EC%98%81%EC%97%AD%3C%2Ftext%3E%3C%2Fsvg%3E')]"
          >
            <div className="absolute inset-0 pointer-events-none">
              {listings.map((listing, index) => (
                <div
                  key={listing.id}
                  className="absolute pointer-events-auto cursor-pointer"
                  style={{
                    left: `${20 + (index % 5) * 15}%`,
                    top: `${20 + Math.floor(index / 5) * 15}%`,
                  }}
                  onClick={() => onMarkerClick?.(listing)}
                >
                  <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 bg-warm-brown text-ivory rounded-full text-xs md:text-sm font-bold shadow-lg hover:scale-110 transition-transform">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {searchQuery && (
            <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-linen/90 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-lg shadow-md">
              <span className="text-xs md:text-sm font-medium text-neutral-dark">{searchQuery}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
