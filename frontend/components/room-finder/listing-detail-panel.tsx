"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  MapPin,
  Building2,
  CreditCard,
  Ruler,
  X,
  Car,
  Refrigerator,
  BedDouble,
  WashingMachine,
  Microwave,
} from "lucide-react";
import type { Listing } from "@/components/room-finder/map-view";
import {
  fetchRoomDetail,
  type ListingDetailResponse,
} from "@/app/api/rooms/route";

interface ListingDetailPanelProps {
  listing: Listing | null;
  isOpen: boolean;
  onClose: () => void;
  listPanelOpen: boolean;
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

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) => {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-warm/60 py-3">
      <span className="shrink-0 text-sm text-neutral-muted">{label}</span>
      <span className="break-words text-right text-sm font-medium text-neutral-dark">
        {value}
      </span>
    </div>
  );
};

const AmenityBadge = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-full border border-border-warm bg-white px-3 py-1.5 text-xs font-medium text-neutral-dark">
    {children}
  </div>
);

export function ListingDetailPanel({
  listing,
  isOpen,
  onClose,
  listPanelOpen,
}: ListingDetailPanelProps) {
  const [detail, setDetail] = useState<ListingDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!listing?.id || !isOpen) return;

    const controller = new AbortController();

    const run = async () => {
      try {
        setIsLoading(true);
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

  const imageUrls = useMemo(() => {
    if (detail?.images?.length) {
      return detail.images.map((image) => image.url);
    }

    if (listing?.images) {
      return [listing.images[0]];
    }

    return [];
  }, [detail?.images, listing?.images]);

  const currentItem = detail?.item;
  const features = detail?.features;
  console.log(currentItem, features);
  if (!listing) return null;

  return (
    <aside
      className={`absolute top-0 z-[15] h-full w-[360px] border-l border-border-warm bg-ivory/95 shadow-2xl backdrop-blur-sm transition-all duration-300 ease-out xl:w-[400px] ${
        listPanelOpen ? "right-[400px] xl:right-[450px]" : "right-[56px]"
      } ${
        isOpen
          ? "translate-x-0 opacity-100"
          : "pointer-events-none translate-x-full opacity-0"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border-warm px-5 py-4">
          <div>
            <p className="text-lg font-semibold text-neutral-dark">
              매물 상세정보
            </p>
            <p className="mt-1 text-xs text-neutral-muted">
              선택한 매물의 세부 내용을 확인할 수 있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border-warm bg-white p-2 text-neutral-dark transition-colors hover:bg-neutral-50"
            aria-label="상세 패널 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-border-warm bg-cream">
            {imageUrls[0] ? (
              <Image
                src={imageUrls[0]}
                alt={currentItem?.title ?? listing.title ?? "매물 이미지"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-neutral-muted">
                이미지가 없습니다.
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-neutral-muted">
              상세 정보를 불러오는 중...
            </div>
          ) : (
            <div className="space-y-6 p-5">
              <section>
                <h2 className="text-xl font-semibold text-neutral-dark">
                  {currentItem?.title || listing.title || "제목 없는 매물"}
                </h2>

                <div className="mt-2 flex items-center gap-2 text-sm text-neutral-muted">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>
                    {currentItem?.address ||
                      listing.address ||
                      "주소 정보 없음"}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl border border-border-warm bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-neutral-muted">
                    <CreditCard className="h-4 w-4" />
                    <span>가격 정보</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-neutral-dark">
                    {formatPrice(currentItem?.deposit, currentItem?.rent)}
                  </p>
                  {currentItem?.manage_cost !== undefined &&
                    currentItem?.manage_cost !== null && (
                      <p className="mt-1 text-sm text-neutral-muted">
                        관리비 {currentItem.manage_cost}만
                      </p>
                    )}
                </div>
              </section>

              {imageUrls.length > 1 && (
                <section>
                  <h3 className="mb-3 text-base font-semibold text-neutral-dark">
                    추가 이미지
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {imageUrls.slice(1, 7).map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="relative aspect-square overflow-hidden rounded-xl border border-border-warm bg-white"
                      >
                        <Image
                          src={url}
                          alt={`매물 이미지 ${index + 2}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-neutral-muted" />
                  <h3 className="text-base font-semibold text-neutral-dark">
                    기본 정보
                  </h3>
                </div>

                <div className="rounded-2xl border border-border-warm bg-white px-4">
                  <DetailRow
                    label="거래 유형"
                    value={currentItem?.service_type}
                  />
                  <DetailRow label="방 유형" value={currentItem?.room_type} />
                  <DetailRow label="층수" value={currentItem?.floor} />
                  <DetailRow
                    label="전체 층수"
                    value={currentItem?.all_floors}
                  />
                  <DetailRow label="상태" value={currentItem?.status} />
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
                  <DetailRow label="방향" value={features?.room_direction} />
                  <DetailRow label="욕실 수" value={features?.bathroom_count} />
                </div>
              </section>

              <section>
                <div className="mb-2 flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-neutral-muted" />
                  <h3 className="text-base font-semibold text-neutral-dark">
                    면적/위치
                  </h3>
                </div>

                <div className="rounded-2xl border border-border-warm bg-white px-4">
                  <DetailRow
                    label="면적"
                    value={
                      currentItem?.area_m2 ? `${currentItem.area_m2}m²` : null
                    }
                  />
                  <DetailRow label="위도" value={currentItem?.lat} />
                  <DetailRow label="경도" value={currentItem?.lng} />
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

              <section>
                <h3 className="mb-3 text-base font-semibold text-neutral-dark">
                  옵션
                </h3>
                <div className="flex flex-wrap gap-2">
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
                      <span className="inline-flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        주차
                      </span>
                    </AmenityBadge>
                  )}
                  {features?.has_elevator && (
                    <AmenityBadge>엘리베이터</AmenityBadge>
                  )}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-base font-semibold text-neutral-dark">
                  생활권
                </h3>
                <div className="flex flex-wrap gap-2">
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

              {(features?.options_raw || features?.amenities_raw) && (
                <section>
                  <h3 className="mb-3 text-base font-semibold text-neutral-dark">
                    원본 부가 정보
                  </h3>
                  <div className="space-y-3 rounded-2xl border border-border-warm bg-white p-4">
                    {features?.options_raw && (
                      <div>
                        <p className="mb-1 text-xs text-neutral-muted">
                          options_raw
                        </p>
                        <p className="text-sm text-neutral-dark">
                          {features.options_raw}
                        </p>
                      </div>
                    )}
                    {features?.amenities_raw && (
                      <div>
                        <p className="mb-1 text-xs text-neutral-muted">
                          amenities_raw
                        </p>
                        <p className="text-sm text-neutral-dark">
                          {features.amenities_raw}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {(currentItem?.url || listing.url) && (
                <section>
                  <a
                    href={currentItem?.url || listing.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-warm-brown px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-warm-brown-dark"
                  >
                    원본 매물 보러가기
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
