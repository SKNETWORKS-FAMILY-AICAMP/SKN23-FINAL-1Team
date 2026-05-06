import { RoomListApiResponse } from "@/types/rooms_type";

export interface RoomSearchParams {
  offset?: number;
  limit?: number;
  search?: string;
  transactionType?: string;
  roomType?: "원룸" | "투룸" | "all";
  structure?: string[];
  deposit?: number | "all";
  monthlyRent?: number | "all";
  size?: number | "all";
  sizeUnit?: "m2" | "pyeong";
  floor?: string;
  options?: string[];
  lat?: number;
  lng?: number;
  swLat?: number;
  swLng?: number;
  neLat?: number;
  neLng?: number;
  level?: number;
  sort?: "latest" | "price_asc" | "price_desc";
  excludeItemId?: number;
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

export function buildSearchBody(params: RoomSearchParams) {
  return {
    offset: params.offset ?? 0,
    limit: params.limit ?? 20,
    search: params.search ?? "",
    transaction_type: params.transactionType ?? "all",
    room_type: params.roomType ?? "all",
    structure:
      params.structure && params.structure.length > 0
        ? params.structure
        : "all",
    deposit: params.deposit ?? "all",
    monthly_rent: params.monthlyRent ?? "all",
    size: params.size ?? "all",
    size_unit: params.sizeUnit ?? "m2",
    floor: params.floor ?? "all",
    options: params.options ?? [],
    lat: params.lat ?? null,
    lng: params.lng ?? null,
    sw_lat: params.swLat ?? null,
    sw_lng: params.swLng ?? null,
    ne_lat: params.neLat ?? null,
    ne_lng: params.neLng ?? null,
    level: params.level ?? null,
    sort: params.sort ?? "latest",
    exclude_item_id: params.excludeItemId ?? null,
  };
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    credentials: "include",
  });

  if (response.status === 499) {
    throw new DOMException("Request aborted.", "AbortError");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Room request failed (${response.status}): ${text}`);
  }

  const text = await response.text();

  if (!text) {
    return null as T;
  }

  return JSON.parse(text) as T;
}

export async function fetchItems(
  params: RoomSearchParams,
): Promise<RoomListApiResponse> {
  return requestJson<RoomListApiResponse>("/api/rooms", {
    method: "POST",
    body: JSON.stringify(buildSearchBody(params)),
    signal: params.signal,
  });
}

export async function fetchMapItems(
  params: RoomSearchParams,
): Promise<MapSearchApiResponse> {
  return requestJson<MapSearchApiResponse>("/api/rooms?mode=map", {
    method: "POST",
    body: JSON.stringify(
      buildSearchBody({
        ...params,
        offset: 0,
        limit: params.limit ?? 1000,
      }),
    ),
    signal: params.signal,
  });
}

export async function fetchRoomDetail(
  itemId: number,
  signal?: AbortSignal,
): Promise<ListingDetailResponse> {
  return requestJson<ListingDetailResponse>(`/api/rooms?item_id=${itemId}`, {
    method: "GET",
    signal,
  });
}
