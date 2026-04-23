"use client";

import { useState, useCallback, useEffect } from "react";
import { Heart, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  fetchFavorites as apiFetchFavorites,
  addFavorite,
  removeFavorite,
} from "@/lib/api/favorites";
import { fetchRoomDetail } from "@/lib/api/rooms";
import { usePendingListingStore } from "@/store/pendingListingStore";

type RoomTab = "all" | "oneroom" | "tworoom";

interface Property {
  id: number;
  image: string;
  tag: string;
  title: string;
  price: string;
  address: string;
  area: string;
  floor: string;
  type: "oneroom" | "tworoom";
  lat: number;
  lng: number;
  deposit: number;
  rent: number;
  structure: string;
}

function formatPrice(deposit: number, rent: number): string {
  const fmt = (v: number) => {
    if (v >= 10000) {
      const eok = Math.floor(v / 10000);
      const rest = v % 10000;
      return rest === 0 ? `${eok}억` : `${eok}억 ${rest}만`;
    }
    return `${v}만`;
  };
  if (rent <= 0) return `전세 ${fmt(deposit)}`;
  return `${fmt(deposit)} / ${rent}만`;
}

function getRoomType(roomType: string): "oneroom" | "tworoom" {
  return roomType.includes("투룸") ? "tworoom" : "oneroom";
}

interface LikedSectionProps {
  userId: number;
}

export function LikedSection({ userId }: LikedSectionProps) {
  const router = useRouter();
  const setPendingListing = usePendingListingStore((state) => state.setPendingListing);
  const [activeTab, setActiveTab] = useState<RoomTab>("all");
  const [likedProperties, setLikedProperties] = useState<Property[]>([]);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetchFavorites(userId);
      const itemIds: number[] = data.items.map((f) => f.item_id);
      setLikedIds(new Set(itemIds));

      const properties = await Promise.all(
        itemIds.map(async (itemId) => {
          const detail = await fetchRoomDetail(itemId);
          const item = detail.item;
          return {
            id: item.item_id,
            image: detail.images?.[0]?.url || "",
            tag: item.room_type || "매물",
            title: item.title || "제목 없음",
            price: formatPrice(item.deposit, item.rent),
            address: item.address,
            area: item.area_m2 ? `${item.area_m2.toFixed(2)}㎡` : "-",
            floor: item.floor || "-",
            type: getRoomType(item.room_type || ""),
            lat: Number(item.lat),
            lng: Number(item.lng),
            deposit: item.deposit,
            rent: item.rent,
            structure: item.room_type || "",
          } as Property;
        }),
      );

      setLikedProperties(properties.filter(Boolean) as Property[]);
    } catch (error) {
      console.error("찜 목록 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleLike = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const isLiked = likedIds.has(id);
    try {
      if (isLiked) {
        await removeFavorite(id, userId);
        setLikedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
        setLikedProperties((prev) => prev.filter((p) => p.id !== id));
      } else {
        await addFavorite(id, userId);
        setLikedIds((prev) => new Set(prev).add(id));
        await loadFavorites();
      }
    } catch (error) {
      console.error("찜 토글 실패:", error);
    }
  };

  const handleCardClick = (property: Property) => {
    setPendingListing({
      id: String(property.id),
      title: property.title,
      price: property.price,
      deposit: String(property.deposit),
      monthlyRent: String(property.rent),
      address: property.address,
      size: property.area,
      floor: property.floor,
      images: property.image ? [property.image] : [],
      lat: property.lat,
      lng: property.lng,
      structure: property.structure,
      options: [],
    });
    router.push("/home");
  };

  const filteredLiked = likedProperties.filter((p) => {
    if (activeTab === "all") return true;
    return p.type === activeTab;
  });

  return (
    <div>
      <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400 md:mb-4">
        찜한 매물
      </p>
      <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-stone-200/80 bg-white/65 p-1 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur-md md:mb-4 md:gap-1.5 md:p-1.5">
        {(["all", "oneroom", "tworoom"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold tracking-tight transition-all duration-200 md:px-4 md:py-2 md:text-sm",
              activeTab === tab
                ? "bg-white text-stone-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                : "text-stone-500 hover:text-stone-800",
            )}
          >
            {tab === "all" ? "전체" : tab === "oneroom" ? "원룸" : "투룸"}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="py-10 text-center text-sm font-medium text-stone-400">
          불러오는 중...
        </div>
      ) : filteredLiked.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-stone-200 bg-white/80 px-4 py-10 text-center text-sm font-medium text-stone-500">
          찜한 매물이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
          {filteredLiked.map((property) => (
            <div
              key={property.id}
              onClick={() => handleCardClick(property)}
              className="cursor-pointer overflow-hidden rounded-[20px] border border-stone-200/80 bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-200 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
            >
              <div className="relative h-36 w-full bg-stone-100 md:h-48">
                {property.image ? (
                  <img src={property.image} alt={property.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-stone-100">
                    <ImageIcon className="h-8 w-8 text-stone-300 md:h-10 md:w-10" />
                  </div>
                )}
                <span className="absolute left-2.5 top-2.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm md:text-[11px]">
                  {property.tag}
                </span>
                <button
                  onClick={(e) => toggleLike(e, property.id)}
                  className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-all duration-200 hover:scale-110 md:h-8 md:w-8"
                >
                  <Heart className={cn("h-3.5 w-3.5 transition-colors duration-200 md:h-4 md:w-4", likedIds.has(property.id) ? "fill-red-500 text-red-500" : "text-stone-400")} />
                </button>
              </div>
              <div className="p-2.5 md:p-3">
                <p className="truncate text-xs font-semibold tracking-tight text-stone-700 md:text-sm">{property.title}</p>
                <p className="mt-1 text-sm font-bold tracking-tight text-stone-900 md:text-base">{property.price}</p>
                <p className="mt-1 truncate text-[11px] font-medium text-stone-400 md:text-xs">{property.address}</p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-stone-400 md:mt-2 md:gap-2 md:text-xs">
                  <span>{property.area}</span>
                  <span className="text-stone-200">|</span>
                  <span>{property.floor}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
