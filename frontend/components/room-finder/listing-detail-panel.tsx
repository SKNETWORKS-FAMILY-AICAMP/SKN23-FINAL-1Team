"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Building2,
  Ruler,
  X,
  Car,
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
} from "lucide-react";
import type { Listing } from "@/components/room-finder/map-view";
import {
  fetchMarketPrice,
  fetchRoomDetail,
  type ListingDetailResponse,
  type MarketPriceResponse,
} from "@/lib/api/rooms";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { isValidImageSrc } from "../common/ListingCards";
import { FavoriteButton } from "@/components/common/Button";

interface ListingDetailPanelProps {
  listing: Listing | null;
  isOpen: boolean;
  onClose: () => void;
  listPanelOpen?: boolean;
  favoriteIds: number[];
  favoriteLoadingIds: number[];
  onToggleFavorite: (listingId: number) => void;
  onPhotoClick?: (images: string[], index: number) => void;
  onFindSimilarFromPhoto?: (
    imageUrl: string,
    listingId: number,
    imageId?: number,
  ) => void;
  isFindingSimilarFromPhoto?: boolean;
}

const formatKoreanMoney = (value: number) => {
  if (value >= 10000) {
    const eok = Math.floor(value / 10000);
    const rest = value % 10000;
    return rest === 0 ? `${eok}억` : `${eok}억 ${rest}만`;
  }
  return `${value}만`;
};

const formatPrice = (deposit?: number | null, rent?: number | null) => {
  const safeDeposit = Number(deposit ?? 0);
  const safeRent = Number(rent ?? 0);
  if (safeRent <= 0) {
    return `전세 ${formatKoreanMoney(safeDeposit)}`;
  }
  return `${formatKoreanMoney(safeDeposit)} / ${safeRent}만`;
};

const formatWon = (value?: number | null) => {
  if (value === undefined || value === null) return "-";
  return `${value.toLocaleString("ko-KR")}원`;
};

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
};

const formatAreaValue = (
  areaM2?: number | null,
  unit: "m2" | "pyeong" = "m2",
) => {
  if (areaM2 === undefined || areaM2 === null) return null;
  const safeArea = Number(areaM2);
  if (Number.isNaN(safeArea)) return null;
  if (unit === "m2") {
    return `${safeArea.toFixed(1)}m²`;
  }
  return `${(safeArea / 3.3058).toFixed(1)}평`;
};

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) => {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone-200/80 py-4 last:border-b-0">
      <span className="shrink-0 text-[13px] font-medium tracking-tight text-stone-500">
        {label}
      </span>
      <span className="max-w-[65%] break-words text-right text-sm font-semibold leading-6 text-stone-800">
        {value}
      </span>
    </div>
  );
};

const AmenityBadge = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center rounded-full border border-stone-200 bg-gradient-to-b from-white to-stone-50 px-3.5 py-2 text-xs font-semibold tracking-tight text-stone-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-transform duration-200 hover:-translate-y-[1px]">
    {children}
  </div>
);

const MarketPriceSection = ({
  data,
  isLoading,
}: {
  data: MarketPriceResponse | null;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <section className="rounded-[28px] border border-stone-200/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
        <h3 className="text-base font-bold tracking-tight text-stone-900">
          시세 분석
        </h3>
        <p className="mt-3 text-sm font-medium text-stone-500">
          시세 데이터를 불러오는 중...
        </p>
      </section>
    );
  }

  if (!data) return null;

  const shouldShowRentForecast = data.market_type !== "전세";
  const marketGroupLabel = data.market_type === "전세" ? "전세" : "월세/반전세";
  const chartData = [
    ...data.timeseries.map((point) => ({
      dealDate: point.dealDate,
      actual: point.rent_per_m2_won,
      predicted: null as number | null,
    })),
    {
      dealDate: "예측",
      actual: null as number | null,
      predicted: data.predicted_rent_per_m2_won,
    },
  ];

  return (
    <section className="rounded-[28px] border border-stone-200/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold text-stone-500">
            {data.guNm ? `${data.guNm} ${data.umdNm}` : data.umdNm}
          </p>
          {shouldShowRentForecast && (
            <h3 className="mt-1 text-base font-bold tracking-tight text-stone-900">
              단위 면적 당 시세 분석
            </h3>
          )}
        </div>
        {shouldShowRentForecast && data.status_label && (
          <span className="rounded-full bg-stone-900 px-3 py-1 text-[11px] font-bold text-white">
            {data.status_label}
          </span>
        )}
      </div>

      {shouldShowRentForecast && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3">
              <p className="text-[11px] font-semibold text-stone-500">
                현재 단위 시세
              </p>
              <p className="mt-1 text-sm font-extrabold text-stone-900">
                {formatWon(data.current_rent_per_m2_won)}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
              <p className="text-[11px] font-semibold text-amber-700">
                예측 단위 시세
              </p>
              <p className="mt-1 text-sm font-extrabold text-stone-900">
                {formatWon(data.predicted_rent_per_m2_won)}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3">
              <p className="text-[11px] font-semibold text-stone-500">변화율</p>
              <p className="mt-1 text-sm font-extrabold text-stone-900">
                {formatPercent(data.change_rate)}
              </p>
            </div>
          </div>

          <div className="mt-5 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ left: -10, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#e7e5e4"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="dealDate"
                  tick={{ fontSize: 10, fill: "#78716c" }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#78716c" }}
                  tickFormatter={(value) =>
                    `${Math.round(Number(value) / 10000)}만`
                  }
                  width={38}
                />
                <Tooltip
                  formatter={(value) => formatWon(Number(value))}
                  labelFormatter={(label) => `${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="실거래 기반"
                  stroke="#292524"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="예측"
                  stroke="#f59e0b"
                  strokeWidth={0}
                  dot={{ r: 5, fill: "#f59e0b", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {data.recent_prices.length > 0 && (
        <div className="mt-5">
          <h4 className="text-[13px] font-bold text-stone-900">
            최근 {marketGroupLabel} 거래내역
          </h4>
          <div className="mt-2 space-y-2">
            {data.recent_prices.map((price) => (
              <div
                key={price.price_id}
                className="flex items-center justify-between rounded-2xl border border-stone-100 bg-white px-3 py-2 text-[12px]"
              >
                <div>
                  <p className="font-bold text-stone-900">
                    {price.room_class} {price.deal_year}.
                    {String(price.deal_month).padStart(2, "0")}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-stone-500">
                    {price.area_m2}m² · {price.floor}층 · {price.build_year}년식
                  </p>
                </div>
                <p className="font-extrabold text-stone-900">
                  {formatPrice(price.deposit, price.monthly_rent)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export function ListingDetailPanel({
  listing,
  isOpen,
  onClose,
  favoriteIds,
  favoriteLoadingIds,
  onToggleFavorite,
  onPhotoClick,
  onFindSimilarFromPhoto,
  isFindingSimilarFromPhoto = false,
}: ListingDetailPanelProps) {
  const [detail, setDetail] = useState<ListingDetailResponse | null>(null);
  const [marketPrice, setMarketPrice] = useState<MarketPriceResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isMarketPriceLoading, setIsMarketPriceLoading] = useState(false);
  const [areaUnit, setAreaUnit] = useState<"m2" | "pyeong">("m2");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const listingId = Number(listing?.id ?? 0);
  const isFavorite = favoriteIds.includes(listingId);
  const isFavoriteLoading = favoriteLoadingIds.includes(listingId);

  useEffect(() => {
    if (!listing?.id || !isOpen) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        setIsLoading(true);
        setMarketPrice(null);
        const data = await fetchRoomDetail(
          Number(listing.id),
          controller.signal,
        );
        setDetail(data);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setDetail(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };
    run();
    return () => controller.abort();
  }, [listing?.id, isOpen]);

  useEffect(() => {
    if (!listing?.id || !isOpen) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        setIsMarketPriceLoading(true);
        const data = await fetchMarketPrice(
          Number(listing.id),
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setMarketPrice(data);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setMarketPrice(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsMarketPriceLoading(false);
        }
      }
    };
    run();
    return () => controller.abort();
  }, [listing?.id, isOpen]);

  const imageUrls = useMemo(() => {
    const rawUrls = detail?.images?.length
      ? detail.images.map((image) => image.url)
      : listing?.images
        ? [listing.images[0]]
        : [];
    return rawUrls
      .filter((url): url is string => isValidImageSrc(url))
      .map((url) => (url.startsWith("/api/images/") ? `/backend${url}` : url));
  }, [detail?.images, listing?.images]);

  const similarSearchImageUrls = useMemo(() => {
    if (detail?.images?.length) {
      return detail.images.map(
        (image) => `/api/rooms/${listingId}/images/${image.id}`,
      );
    }
    return imageUrls;
  }, [detail?.images, imageUrls, listingId]);

  const similarSearchImageIds = useMemo(() => {
    if (detail?.images?.length) {
      return detail.images.map((image) => image.id);
    }
    return [];
  }, [detail?.images]);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [imageUrls.length, listing?.id]);

  useEffect(() => {
    if (!listing?.id || !isOpen) return;
    console.table(
      imageUrls.map((url, index) => {
        try {
          const parsedUrl = new URL(url, window.location.origin);
          return {
            index: index + 1,
            host: parsedUrl.host,
            path: parsedUrl.pathname,
            hasQuery: parsedUrl.search.length > 0,
            proxiedByNext: parsedUrl.pathname === "/_next/image",
          };
        } catch {
          return {
            index: index + 1,
            host: "",
            path: url,
            hasQuery: url.includes("?"),
            proxiedByNext: url.includes("/_next/image"),
          };
        }
      }),
    );
    console.log("[listing-detail-images]", {
      listingId: listing.id,
      detailImageCount: detail?.images?.length ?? 0,
      renderedImageCount: imageUrls.length,
      firstUrl: imageUrls[0] ?? null,
    });
  }, [detail?.images?.length, imageUrls, isOpen, listing?.id]);

  const currentItem = detail?.item;
  const features = detail?.features;

  if (!listing) return null;

  const directionMap: Record<string, string> = {
    S: "남향",
    W: "서향",
    E: "동향",
    N: "북향",
    SE: "남동향",
    SW: "남서향",
    NE: "북동향",
    NW: "북서향",
  };

  const areaText = formatAreaValue(currentItem?.area_m2, areaUnit);

  return (
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(248,246,241,0.96)_100%)] backdrop-blur-xl">
      <div className="flex h-full flex-col">
        <div className="border-b border-stone-200/80 bg-white/70 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-800">
                {currentItem?.title || listing.title || "매물 상세"}
              </p>
              <p className="truncate text-xs text-stone-500">
                {currentItem?.address || listing.address || ""}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <FavoriteButton
                isFavorite={isFavorite}
                disabled={isFavoriteLoading || !listingId}
                onClick={() => onToggleFavorite(listingId)}
                className="h-8 w-8 border-stone-200 bg-white/90 shadow-none hover:bg-stone-100"
              />
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-500 transition-all duration-200 hover:bg-stone-100 hover:text-stone-700"
                aria-label="목록으로 돌아가기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide cursor-default">
          <div className="border-b border-stone-200 bg-stone-100">
            {imageUrls.length > 0 ? (
              <Carousel
                opts={{ loop: true }}
                className="group relative w-full"
                setApi={(api) => {
                  if (!api) return;
                  setCarouselApi(api);
                  setCurrentImageIndex(api.selectedScrollSnap());
                  api.on("select", () => {
                    setCurrentImageIndex(api.selectedScrollSnap());
                  });
                }}
              >
                <CarouselContent className="ml-0">
                  {imageUrls.map((url, index) => (
                    <CarouselItem key={`${url}-${index}`} className="pl-0">
                      <div
                        className="relative aspect-[4/3] min-w-fit cursor-pointer overflow-hidden"
                        onClick={() => onPhotoClick?.(imageUrls, index)}
                        title="클릭해서 크게 보기"
                      >
                        <Image
                          src={url}
                          alt={`${currentItem?.title ?? listing.title ?? "매물 이미지"} ${index + 1}`}
                          fill
                          sizes="(min-width: 1280px) 440px, 380px"
                          unoptimized
                          className="object-cover transition-transform duration-700 hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent" />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>

                {onFindSimilarFromPhoto && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onFindSimilarFromPhoto(
                        similarSearchImageUrls[currentImageIndex] ??
                          imageUrls[currentImageIndex],
                        listingId,
                        similarSearchImageIds[currentImageIndex],
                      );
                    }}
                    disabled={isFindingSimilarFromPhoto}
                    className="absolute left-1/2 top-1/2 z-20 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-bold text-stone-900 opacity-0 shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 group-hover:opacity-100"
                    aria-label="이 사진으로 유사 매물 찾기"
                  >
                    <Search className="h-4 w-4" />
                    {isFindingSimilarFromPhoto ? "검색 중" : "유사매물 찾기"}
                  </button>
                )}

                <div
                  className="absolute bottom-12 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs text-white opacity-0 backdrop-blur-sm transition-all duration-200 hover:scale-105 group-hover:opacity-100 cursor-pointer"
                  onClick={() => onPhotoClick?.(imageUrls, currentImageIndex)}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect
                      x="0.5"
                      y="0.5"
                      width="7"
                      height="7"
                      rx="1.5"
                      stroke="white"
                      strokeWidth="1"
                    />
                    <path
                      d="M6 6L11 11"
                      stroke="white"
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                  </svg>
                  크게 보기
                </div>

                {imageUrls.length > 1 && (
                  <div className="absolute bottom-4 right-4 z-20 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    {currentImageIndex + 1} / {imageUrls.length}
                  </div>
                )}

                {imageUrls.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        carouselApi?.scrollPrev();
                      }}
                      className="group/nav absolute left-4 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-white shadow-none"
                      aria-label="이전 사진"
                    >
                      <ChevronLeft
                        className="h-9 w-9 transition-transform duration-200 group-hover/nav:scale-150"
                        strokeWidth={2.4}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        carouselApi?.scrollNext();
                      }}
                      className="group/nav absolute right-4 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-white shadow-none"
                      aria-label="다음 사진"
                    >
                      <ChevronRight
                        className="h-9 w-9 transition-transform duration-200 group-hover/nav:scale-150"
                        strokeWidth={2.4}
                      />
                    </button>
                  </>
                )}
              </Carousel>
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center text-sm font-medium text-stone-500">
                이미지가 없습니다.
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="p-6 text-sm font-medium text-stone-500">
              상세 정보를 불러오는 중...
            </div>
          ) : (
            <div className="space-y-7 px-5 py-6">
              <section className="rounded-[28px] border border-stone-200/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                <h2 className="text-[24px] font-bold leading-8 tracking-tight text-stone-900">
                  {currentItem?.title || listing.title || "제목 없는 매물"}
                </h2>
                <div className="mt-3 flex items-start gap-2.5 text-sm text-stone-500">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="leading-6">
                    {currentItem?.address ||
                      listing.address ||
                      "주소 정보 없음"}
                  </span>
                </div>
                <div className="mt-5 overflow-hidden rounded-[24px] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_24px_rgba(245,158,11,0.08)]">
                  <p className="mt-2 text-[30px] font-extrabold tracking-tight text-stone-900">
                    {formatPrice(currentItem?.deposit, currentItem?.rent)}
                  </p>
                  {currentItem?.manage_cost !== undefined &&
                    currentItem?.manage_cost !== null && (
                      <p className="mt-2 text-sm font-medium text-stone-500">
                        관리비 {currentItem.manage_cost}만
                      </p>
                    )}
                </div>
              </section>

              <section className="rounded-[28px] border border-stone-200/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold tracking-tight text-stone-900">
                    기본 정보
                  </h3>
                </div>
                <div className="rounded-2xl border border-stone-100 bg-white px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <DetailRow label="방 유형" value={currentItem?.room_type} />
                  <DetailRow
                    label="층수"
                    value={currentItem?.floor ? `${currentItem.floor}층` : null}
                  />
                  <DetailRow
                    label="전체 층수"
                    value={
                      currentItem?.all_floors
                        ? `${Number(currentItem.all_floors)}층`
                        : null
                    }
                  />
                  <DetailRow
                    label="입주 가능일"
                    value={features?.movein_date}
                  />
                  <DetailRow
                    label="사용 승인일"
                    value={features?.approve_date}
                  />
                  <DetailRow
                    label="주거 형태"
                    value={features?.residence_type}
                  />
                  <DetailRow
                    label="방향"
                    value={
                      features?.room_direction
                        ? (directionMap[features.room_direction] ??
                          features.room_direction)
                        : null
                    }
                  />
                  <DetailRow label="욕실 수" value={features?.bathroom_count} />
                </div>
              </section>

              <section className="rounded-[28px] border border-stone-200/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                    <Ruler className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold tracking-tight text-stone-900">
                    면적/위치
                  </h3>
                </div>
                <div className="rounded-2xl border border-stone-100 bg-white px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  {areaText && (
                    <div className="flex items-center justify-between gap-4 border-b border-stone-200/80 py-4">
                      <span className="shrink-0 text-[13px] font-medium tracking-tight text-stone-500">
                        면적
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="relative inline-grid grid-cols-2 gap-4 rounded-xl border border-stone-200 bg-stone-50 p-1 shadow-inner">
                          <span
                            className={`absolute bottom-1 top-1 w-[calc(50%-0.625rem)] rounded-lg bg-stone-900 shadow-sm transition-transform duration-200 ease-out ${areaUnit === "pyeong" ? "translate-x-[calc(100%+1rem)]" : "translate-x-0"}`}
                          />
                          <button
                            type="button"
                            onClick={() => setAreaUnit("m2")}
                            className={`relative z-10 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer scale-110 ${areaUnit === "m2" ? "text-white" : "text-stone-600 hover:text-stone-900"}`}
                          >
                            m²
                          </button>
                          <button
                            type="button"
                            onClick={() => setAreaUnit("pyeong")}
                            className={`relative z-10 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer scale-110 ${areaUnit === "pyeong" ? "text-white" : "text-stone-600 hover:text-stone-900"}`}
                          >
                            평
                          </button>
                        </div>
                        <span className="break-words text-right text-sm font-bold text-stone-800">
                          {areaText}
                        </span>
                      </div>
                    </div>
                  )}
                  <DetailRow
                    label="지하철 거리"
                    value={
                      features?.dist_subway ? `${features.dist_subway}m` : null
                    }
                  />
                  <DetailRow
                    label="버스 거리"
                    value={features?.dist_bus ? `${features.dist_bus}m` : null}
                  />
                  <DetailRow
                    label="편의점 거리"
                    value={
                      features?.dist_conv ? `${features.dist_conv}m` : null
                    }
                  />
                  <DetailRow
                    label="마트 거리"
                    value={
                      features?.dist_mart ? `${features.dist_mart}m` : null
                    }
                  />
                  <DetailRow
                    label="카페 거리"
                    value={
                      features?.dist_cafe ? `${features.dist_cafe}m` : null
                    }
                  />
                  <DetailRow
                    label="세탁소 거리"
                    value={
                      features?.dist_laundry
                        ? `${features.dist_laundry}m`
                        : null
                    }
                  />
                </div>
              </section>

              <section className="rounded-[28px] border border-stone-200/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                <h3 className="mb-4 text-base font-bold tracking-tight text-stone-900">
                  옵션
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {features?.has_air_con && <AmenityBadge>에어컨</AmenityBadge>}
                  {features?.has_fridge && <AmenityBadge>냉장고</AmenityBadge>}
                  {features?.has_washer && <AmenityBadge>세탁기</AmenityBadge>}
                  {features?.has_gas_stove && (
                    <AmenityBadge>가스레인지</AmenityBadge>
                  )}
                  {features?.has_induction && (
                    <AmenityBadge>인덕션</AmenityBadge>
                  )}
                  {features?.has_microwave && (
                    <AmenityBadge>전자레인지</AmenityBadge>
                  )}
                  {features?.has_desk && <AmenityBadge>책상</AmenityBadge>}
                  {features?.has_bed && <AmenityBadge>침대</AmenityBadge>}
                  {features?.has_closet && <AmenityBadge>옷장</AmenityBadge>}
                  {features?.has_shoe_rack && (
                    <AmenityBadge>신발장</AmenityBadge>
                  )}
                  {features?.has_bookcase && <AmenityBadge>책장</AmenityBadge>}
                  {features?.has_sink && <AmenityBadge>싱크대</AmenityBadge>}
                  {features?.has_parking && (
                    <AmenityBadge>
                      <span className="inline-flex items-center gap-1.5">
                        <Car className="h-3.5 w-3.5" />
                        주차
                      </span>
                    </AmenityBadge>
                  )}
                  {features?.has_elevator && (
                    <AmenityBadge>엘리베이터</AmenityBadge>
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border border-stone-200/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                <h3 className="mb-4 text-base font-bold tracking-tight text-stone-900">
                  생활권
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {features?.is_subway_area && (
                    <AmenityBadge>역세권</AmenityBadge>
                  )}
                  {features?.is_convenient_area && (
                    <AmenityBadge>생활편의권</AmenityBadge>
                  )}
                  {features?.is_park_area && (
                    <AmenityBadge>공원 인접</AmenityBadge>
                  )}
                  {features?.is_school_area && (
                    <AmenityBadge>학교 인접</AmenityBadge>
                  )}
                  {features?.is_coupang && (
                    <AmenityBadge>쿠팡 가능</AmenityBadge>
                  )}
                  {features?.is_ssg && <AmenityBadge>SSG 가능</AmenityBadge>}
                  {features?.is_marketkurly && (
                    <AmenityBadge>마켓컬리 가능</AmenityBadge>
                  )}
                  {features?.is_baemin && (
                    <AmenityBadge>배민 가능</AmenityBadge>
                  )}
                  {features?.is_yogiyo && (
                    <AmenityBadge>요기요 가능</AmenityBadge>
                  )}
                </div>
              </section>

              <MarketPriceSection
                data={marketPrice}
                isLoading={isMarketPriceLoading}
              />

              {/* 중개사 정보 */}
              {detail?.broker && (
                <section className="rounded-[28px] border border-stone-200/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                        <Phone className="h-4 w-4" />
                      </div>
                      <h3 className="text-base font-bold tracking-tight text-stone-900">
                        중개사 정보
                      </h3>
                    </div>
                    {detail.broker.phone && (
                      <a
                        href={`tel:${detail.broker.phone}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-[11px] font-semibold text-white"
                      >
                        <Phone className="h-3 w-3" />
                        전화하기
                      </a>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <div className="flex flex-[4] items-center justify-center">
                      <div className="h-[90px] w-[90px] overflow-hidden rounded-full border border-stone-200 bg-stone-100">
                        {detail.broker.photo_url ? (
                          <img
                            src={detail.broker.photo_url}
                            alt="중개사 프로필"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Building2 className="h-8 w-8 text-stone-300" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-[6] rounded-2xl border border-stone-100 bg-white px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                      <DetailRow label="담당자" value={detail.broker.name} />
                      <DetailRow
                        label="중개사무소"
                        value={detail.broker.office_name}
                      />
                      <DetailRow label="연락처" value={detail.broker.phone} />
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
