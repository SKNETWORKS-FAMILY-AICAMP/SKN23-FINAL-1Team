"use client";

import { ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRecentStore } from "@/store/recentStore";
import { usePendingListingStore } from "@/store/pendingListingStore";

export function RecentSection() {
  const router = useRouter();
  const recentListings = useRecentStore((state) => state.recentListings);
  const setPendingListing = usePendingListingStore((state) => state.setPendingListing);

  return (
    <div>
      <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400 md:mb-4">
        {"\uCD5C\uADFC \uBCF8 \uB9E4\uBB3C"}
      </p>
      {recentListings.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-stone-200 bg-white/80 px-4 py-10 text-center text-sm font-medium text-stone-500">
          {"\uCD5C\uADFC \uBCF8 \uB9E4\uBB3C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
          {recentListings.map((listing) => (
            <div
              key={listing.id}
              className="cursor-pointer overflow-hidden rounded-[20px] border border-stone-200/80 bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-200 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
              onClick={() => {
                console.log("[RecentSection] click listing", { id: listing.id, lat: listing.lat, lng: listing.lng, title: listing.title });
                setPendingListing({
                  id: listing.id,
                  title: listing.title,
                  price: listing.price,
                  deposit: "",
                  monthlyRent: "",
                  address: listing.address,
                  size: listing.size,
                  floor: listing.floor,
                  images: listing.images,
                  lat: listing.lat,
                  lng: listing.lng,
                  structure: listing.structure,
                  options: [],
                });
                router.push("/home");
              }}
            >
              <div className="relative h-36 w-full bg-stone-100 md:h-48">
                {listing.images?.[0] ? (
                  <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-stone-100">
                    <ImageIcon className="h-8 w-8 text-stone-300 md:h-10 md:w-10" />
                  </div>
                )}
                <span className="absolute left-2.5 top-2.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm md:text-[11px]">
                  {listing.structure ?? "\uB9E4\uBB3C"}
                </span>
              </div>
              <div className="p-2.5 md:p-3">
                <p className="truncate text-xs font-semibold tracking-tight text-stone-700 md:text-sm">{listing.title}</p>
                <p className="mt-1 text-sm font-bold tracking-tight text-stone-900 md:text-base">{listing.price}</p>
                <p className="mt-1 truncate text-[11px] font-medium text-stone-400 md:text-xs">{listing.address}</p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-stone-400 md:mt-2 md:gap-2 md:text-xs">
                  <span>{listing.size ?? "-"}</span>
                  <span className="text-stone-200">|</span>
                  <span>{listing.floor ?? "-"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
