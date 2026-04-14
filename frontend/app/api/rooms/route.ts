import { RoomListApiResponse } from "@/types/rooms_type";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const MAX_RETRIES = 1;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface RoomSearchParams {
  offset?: number;
  limit?: number;
  search?: string;
  transactionType?: string;
  roomType?: "원룸" | "투룸" | "all";
  structure?: string;
  deposit?: number | "all";
  monthlyRent?: number | "all";
  size?: number | "all";
  sizeUnit?: "m2" | "pyeong";
  options?: string[];
  lat?: number;
  lng?: number;
  swLat?: number;
  swLng?: number;
  neLat?: number;
  neLng?: number;
  level?: number;
  signal?: AbortSignal;
}

export interface MapClusterItem {
  type: "cluster";
  id: string;
  lat: number;
  lng: number;
  count: number;
}

export interface MapMarkerItem {
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

export type MapItemResponse = MapClusterItem | MapMarkerItem;

export interface MapSearchApiResponse {
  mode: "cluster" | "marker";
  items: MapItemResponse[];
}

async function postJsonWithRetry<T>(
  url: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        throw new Error("매물 데이터를 불러오지 못했습니다.");
      }

      return response.json();
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }

      lastError = error;

      if (attempt === MAX_RETRIES) {
        break;
      }

      await delay(500);
    }
  }

  throw lastError ?? new Error("매물 데이터를 불러오지 못했습니다.");
}

function buildSearchBody(params: RoomSearchParams) {
  return {
    offset: params.offset ?? 0,
    limit: params.limit ?? 20,
    search: params.search ?? "",
    transaction_type: params.transactionType ?? "all",
    room_type: params.roomType ?? "all",
    structure: params.structure ?? "all",
    deposit: params.deposit ?? "all",
    monthly_rent: params.monthlyRent ?? "all",
    size: params.size ?? "all",
    size_unit: params.sizeUnit ?? "m2",
    options: params.options ?? [],
    lat: params.lat ?? null,
    lng: params.lng ?? null,
    sw_lat: params.swLat ?? null,
    sw_lng: params.swLng ?? null,
    ne_lat: params.neLat ?? null,
    ne_lng: params.neLng ?? null,
    level: params.level ?? null,
  };
}

export async function fetchItems(
  params: RoomSearchParams,
): Promise<RoomListApiResponse> {
  return postJsonWithRetry<RoomListApiResponse>(
    `${API_BASE_URL}/rooms/search`,
    buildSearchBody(params),
    params.signal,
  );
}

export async function fetchMapItems(
  params: RoomSearchParams,
): Promise<MapSearchApiResponse> {
  return postJsonWithRetry<MapSearchApiResponse>(
    `${API_BASE_URL}/rooms/map-search`,
    buildSearchBody({
      ...params,
      offset: 0,
      limit: params.limit ?? 1000,
    }),
    params.signal,
  );
}

export interface ListingDetailResponse {
  item: {
    item_id: number;
    status: string;
    title: string | null;
    url: string | null;
    address: string;
    deposit: number;
    rent: number;
    manage_cost: number | null;
    service_type: string | null;
    room_type: string | null;
    floor: string | null;
    all_floors: string | null;
    area_m2: number | null;
    lat: number;
    lng: number;
    geohash: string | null;
    image_thumbnail: string | null;
  };
  features: {
    has_parking?: boolean | null;
    parking_count?: number | null;
    has_elevator?: boolean | null;
    bathroom_count?: number | null;
    residence_type?: string | null;
    room_direction?: string | null;
    movein_date?: string | null;
    approve_date?: string | null;
    has_air_con?: boolean | null;
    has_fridge?: boolean | null;
    has_washer?: boolean | null;
    has_gas_stove?: boolean | null;
    has_induction?: boolean | null;
    has_microwave?: boolean | null;
    has_desk?: boolean | null;
    has_bed?: boolean | null;
    has_closet?: boolean | null;
    has_shoe_rack?: boolean | null;
    has_bookcase?: boolean | null;
    has_sink?: boolean | null;
    dist_subway?: number | null;
    dist_pharmacy?: number | null;
    dist_conv?: number | null;
    dist_bus?: number | null;
    dist_mart?: number | null;
    dist_laundry?: number | null;
    dist_cafe?: number | null;
    is_coupang?: boolean | null;
    is_ssg?: boolean | null;
    is_marketkurly?: boolean | null;
    is_baemin?: boolean | null;
    is_yogiyo?: boolean | null;
    is_subway_area?: boolean | null;
    is_convenient_area?: boolean | null;
    is_park_area?: boolean | null;
    is_school_area?: boolean | null;
    options_raw?: string | null;
    amenities_raw?: string | null;
  } | null;
  images: {
    id: number;
    url: string;
    is_main?: boolean | null;
  }[];
}

export async function fetchRoomDetail(
  itemId: number,
  signal?: AbortSignal,
): Promise<ListingDetailResponse> {
  const response = await fetch(`${API_BASE_URL}/rooms/${itemId}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("매물 상세 정보를 불러오지 못했습니다.");
  }

  return response.json();
}
