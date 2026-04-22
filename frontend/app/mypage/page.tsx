"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import {
  Heart,
  Clock,
  Sparkles,
  ChevronRight,
  ImageIcon,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Logo from "@/assets/Logo.png";
import {
  fetchFavorites as apiFetchFavorites,
  addFavorite,
  removeFavorite,
} from "@/lib/api/favorites";
import { fetchRoomDetail } from "@/lib/api/rooms";
import { useRecentStore } from "@/store/recentStore";
import { usePendingListingStore } from "@/store/pendingListingStore";

type Section = "liked" | "recent" | "gallery" | "settings";
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

function getGalleryImageSrc(imageUrl: string) {
  if (imageUrl.startsWith("/api/images/")) {
    return `/backend${imageUrl}`;
  }

  return imageUrl;
}

export default function MyPage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>("liked");
  const [activeTab, setActiveTab] = useState<RoomTab>("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [likedProperties, setLikedProperties] = useState<Property[]>([]);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const recentListings = useRecentStore((state) => state.recentListings);
  const setPendingListing = usePendingListingStore(
    (state) => state.setPendingListing,
  );

  const [galleryImages, setGalleryImages] = useState<
    {
      id: number;
      image_url: string;
      prompt: string | null;
      created_at: string;
    }[]
  >([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(false);

  const loadGallery = useCallback(async () => {
    if (!user?.user_id) return;
    setIsGalleryLoading(true);
    try {
      const r = await fetch(`/api/gallery?user_id=${user.user_id}`);
      if (!r.ok) return;
      const data = await r.json();
      setGalleryImages(data.items);
    } catch (error) {
      console.error("갤러리 조회 실패:", error);
    } finally {
      setIsGalleryLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    if (activeSection === "gallery") loadGallery();
  }, [activeSection, loadGallery]);

  // 찜 목록 조회
  const loadFavorites = useCallback(async () => {
    if (!user?.user_id) return;
    setIsLoading(true);
    try {
      const data = await apiFetchFavorites(user.user_id);
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
          } as Property;
        }),
      );

      setLikedProperties(properties.filter(Boolean) as Property[]);
    } catch (error) {
      console.error("찜 목록 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // 찜 토글
  const toggleLike = async (id: number) => {
    if (!user?.user_id) return;
    const isLiked = likedIds.has(id);

    try {
      if (isLiked) {
        await removeFavorite(id, user.user_id);
        setLikedIds((prev) => {
          const s = new Set(prev);
          s.delete(id);
          return s;
        });
        setLikedProperties((prev) => prev.filter((p) => p.id !== id));
      } else {
        await addFavorite(id, user.user_id);
        setLikedIds((prev) => new Set(prev).add(id));
        await loadFavorites();
      }
    } catch (error) {
      console.error("찜 토글 실패:", error);
    }
  };

  const filteredLiked = likedProperties.filter((p) => {
    if (activeTab === "all") return true;
    return p.type === activeTab;
  });

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,244,238,0.94)_100%)]">
        <div className="text-sm font-medium text-stone-500">
          사용자 정보를 불러오는 중입니다.
        </div>
      </div>
    );
  }

  const getSocialBadge = (socialType?: string | null) => {
    switch (socialType) {
      case "kakao":
        return {
          label: "카카오 연동",
          className: "bg-[#FEE500] text-[#3C1E1E] border-[#FEE500]",
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#3C1E1E">
              <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.542 1.574 4.778 3.938 6.112L4.5 21l4.986-2.697A11.3 11.3 0 0 0 12 18.5c5.523 0 10-3.477 10-7.5S17.523 3 12 3z" />
            </svg>
          ),
        };
      case "naver":
        return {
          label: "네이버 연동",
          className: "bg-[#03C75A] text-white border-[#03C75A]",
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
            </svg>
          ),
        };
      case "google":
        return {
          label: "구글 연동",
          className: "bg-white text-stone-600 border-stone-200",
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84z"
              />
            </svg>
          ),
        };
      default:
        return {
          label: socialType ?? "social",
          className: "bg-stone-100 text-stone-500 border-stone-200",
          icon: null,
        };
    }
  };

  const badge = getSocialBadge(user.social_type ?? null);

  const navItems = [
    { id: "liked" as Section, label: "찜한 매물", icon: Heart },
    { id: "recent" as Section, label: "최근 본 매물", icon: Clock },
    { id: "gallery" as Section, label: "AI 생성 갤러리", icon: Sparkles },
    { id: "settings" as Section, label: "계정 설정", icon: Settings },
  ];

  const menuItems = [
    { label: "닉네임 변경", onClick: () => {} },
    { label: "알림 설정", onClick: () => {} },
    { label: "소셜 계정 연동", onClick: () => {} },
    { label: "서비스 이용약관", onClick: () => {} },
  ];

  const handleNavClick = (id: Section) => {
    setActiveSection(id);
    setSidebarOpen(false);
  };

  const PropertyCard = ({ property }: { property: Property }) => {
    const isLiked = likedIds.has(property.id);
    return (
      <div className="overflow-hidden rounded-[20px] border border-stone-200/80 bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-200 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
        <div className="relative h-36 w-full bg-stone-100 md:h-48">
          {property.image ? (
            <img
              src={property.image}
              alt={property.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-stone-100">
              <ImageIcon className="h-8 w-8 text-stone-300 md:h-10 md:w-10" />
            </div>
          )}
          <span className="absolute left-2.5 top-2.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm md:text-[11px]">
            {property.tag}
          </span>
          <button
            onClick={() => toggleLike(property.id)}
            className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-all duration-200 hover:scale-110 md:h-8 md:w-8"
          >
            <Heart
              className={cn(
                "h-3.5 w-3.5 transition-colors duration-200 md:h-4 md:w-4",
                isLiked ? "fill-red-500 text-red-500" : "text-stone-400",
              )}
            />
          </button>
        </div>
        <div className="p-2.5 md:p-3">
          <p className="truncate text-xs font-semibold tracking-tight text-stone-700 md:text-sm">
            {property.title}
          </p>
          <p className="mt-1 text-sm font-bold tracking-tight text-stone-900 md:text-base">
            {property.price}
          </p>
          <p className="mt-1 truncate text-[11px] font-medium text-stone-400 md:text-xs">
            {property.address}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-stone-400 md:mt-2 md:gap-2 md:text-xs">
            <span>{property.area}</span>
            <span className="text-stone-200">|</span>
            <span>{property.floor}</span>
          </div>
        </div>
      </div>
    );
  };

  const SidebarContent = () => (
    <>
      <div className="border-b border-stone-200/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-base font-bold text-stone-500">
            {user.nickname?.charAt(0) ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-stone-900">
              {user.nickname}
            </p>
            <p className="truncate text-xs text-stone-400">{user.email}</p>
          </div>
        </div>
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            badge.className,
          )}
        >
          {badge.icon}
          {badge.label}
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleNavClick(id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold tracking-tight transition-all duration-200",
              activeSection === id
                ? "border-stone-800 bg-stone-100/80 text-stone-900"
                : "border-transparent text-stone-500 hover:bg-stone-50 hover:text-stone-800",
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>
    </>
  );

  return (
    <div className="flex h-screen flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,244,238,0.94)_100%)]">
      <header className="border-b border-stone-200/80 bg-white/70 backdrop-blur-xl">
        <div className="flex h-16 items-center">
          <div className="flex h-full w-14 flex-shrink-0 items-center justify-center border-r border-stone-200/80 md:w-56">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center md:hidden"
            >
              <Menu className="h-5 w-5 text-stone-500" />
            </button>
            <Image
              src={Logo}
              alt="로고"
              width={120}
              height={40}
              className="hidden object-contain md:block hover:cursor-pointer"
              onClick={() => router.push("/home")}
            />
          </div>
          <p className="flex-1 text-center text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400">
            My Page
          </p>
          <div className="flex w-14 flex-shrink-0 justify-end px-3 md:w-56 md:px-6">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/65 px-3 py-2 text-xs font-semibold tracking-tight text-stone-500 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur-md transition-all duration-200 hover:text-stone-800 md:px-4 md:py-2.5 md:text-sm"
            >
              <span className="hidden md:inline">돌아가기 →</span>
              <span className="md:hidden">←</span>
            </button>
          </div>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div
            className="absolute inset-0 z-20 bg-black/30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={cn(
            "absolute z-30 flex h-full w-72 flex-shrink-0 flex-col border-r border-stone-200/80 bg-white/95 backdrop-blur-md transition-transform duration-300 md:relative md:w-56 md:translate-x-0 md:bg-white/70",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-stone-200/80 px-5 py-4 md:hidden">
            <Image
              src={Logo}
              alt="로고"
              width={100}
              height={32}
              className="object-contain"
            />
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5 text-stone-400" />
            </button>
          </div>
          <SidebarContent />
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* 찜한 매물 */}
          {activeSection === "liked" && (
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
                    {tab === "all"
                      ? "전체"
                      : tab === "oneroom"
                        ? "원룸"
                        : "투룸"}
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
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 최근 본 매물 */}
          {activeSection === "recent" && (
            <div>
              <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400 md:mb-4">
                최근 본 매물
              </p>
              {recentListings.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-stone-200 bg-white/80 px-4 py-10 text-center text-sm font-medium text-stone-500">
                  최근 본 매물이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
                  {recentListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="cursor-pointer"
                      onClick={() => {
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
                      <PropertyCard
                        property={{
                          id: Number(listing.id),
                          image: listing.images?.[0] ?? "",
                          tag: listing.structure ?? "매물",
                          title: listing.title,
                          price: listing.price,
                          address: listing.address,
                          area: listing.size ?? "-",
                          floor: listing.floor ?? "-",
                          type: listing.structure?.includes("투룸")
                            ? "tworoom"
                            : "oneroom",
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI 생성 갤러리 */}
          {activeSection === "gallery" && (
            <div>
              <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400 md:mb-4">
                AI 생성 이미지 갤러리
              </p>
              {isGalleryLoading ? (
                <div className="py-10 text-center text-sm font-medium text-stone-400">
                  불러오는 중...
                </div>
              ) : galleryImages.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-stone-200 bg-white/80 px-4 py-10 text-center text-sm font-medium text-stone-500">
                  저장된 AI 이미지가 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {galleryImages.map((item) => (
                    <div
                      key={item.id}
                      className="relative h-36 w-full overflow-hidden rounded-2xl border border-stone-200/80 md:h-48"
                    >
                      <Image
                        src={getGalleryImageSrc(item.image_url)}
                        alt={item.prompt ?? "AI 생성 이미지"}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                      {item.prompt && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1">
                          <p className="truncate text-[10px] text-white">
                            {item.prompt}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  <div
                    className="flex h-36 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-stone-200 bg-white/80 transition-colors hover:bg-stone-50 md:h-48"
                    onClick={() => router.push("/home")}
                  >
                    <ImageIcon className="h-5 w-5 text-stone-300" />
                    <span className="text-xs font-medium text-stone-400">
                      새 검색
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 계정 설정 */}
          {activeSection === "settings" && (
            <div>
              <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400 md:mb-4">
                계정 설정
              </p>
              <div className="rounded-[20px] border border-stone-200/80 bg-white/80 px-4">
                {menuItems.map((item, idx) => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className={cn(
                      "flex w-full items-center justify-between py-4 text-sm font-semibold tracking-tight text-stone-700 transition-colors duration-200 hover:text-stone-900",
                      idx < menuItems.length - 1 &&
                        "border-b border-stone-200/80",
                    )}
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="h-4 w-4 text-stone-400" />
                  </button>
                ))}
                <div className="border-t border-stone-200/80 py-4">
                  <button className="text-sm font-semibold text-red-500 transition-colors hover:text-red-600">
                    회원탈퇴
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
