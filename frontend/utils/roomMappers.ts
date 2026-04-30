import { RoomApiResponse } from "@/types/rooms_type";
import type { Listing } from "@/components/room-finder/map-view";

export function mapItemToListing(item: RoomApiResponse): Listing {
  return {
    id: String(item.item_id),
    title: item.title ?? "제목 없음",
    price:
      item.rent > 0
        ? `${item.deposit.toLocaleString()}/${item.rent.toLocaleString()}`
        : `전세 ${item.deposit.toLocaleString()}`,
    deposit: item.deposit.toLocaleString(),
    monthlyRent: item.rent > 0 ? item.rent.toLocaleString() : "",
    address: item.address,
    size: item.area_m2 ? `${item.area_m2}㎡` : "-",
    floor: item.floor ?? "-",
    images: item.image_thumbnail ? [item.image_thumbnail] : [],
    lat: Number(item.lat),
    lng: Number(item.lng),
    structure: item.room_type ?? "-",
    options: [],
  };
}

type SimilarRoomApiResponse = {
  id?: string | number;
  item_id?: string | number;
  title?: string | null;
  price?: string | null;
  deposit?: string | number | null;
  monthlyRent?: string | number | null;
  address?: string | null;
  size?: string | null;
  floor?: string | null;
  images?: string[] | null;
  lat?: string | number | null;
  lng?: string | number | null;
  structure?: string | null;
  options?: string[] | null;
  embeddingSimilarity?: number | null;
};

export function mapSimilarItemToListing(item: SimilarRoomApiResponse): Listing {
  const id = item.item_id ?? item.id ?? "";

  return {
    id: String(id),
    title: item.title ?? "제목 없음",
    price: item.price ?? "-",
    deposit: item.deposit === undefined || item.deposit === null
      ? ""
      : String(item.deposit),
    monthlyRent:
      item.monthlyRent === undefined || item.monthlyRent === null
        ? ""
        : String(item.monthlyRent),
    address: item.address ?? "",
    size: item.size ?? "-",
    floor: item.floor ?? "-",
    images: Array.isArray(item.images) ? item.images.filter(Boolean) : [],
    lat: Number(item.lat ?? 0),
    lng: Number(item.lng ?? 0),
    structure: item.structure ?? "-",
    options: item.options ?? [],
    embeddingSimilarity: item.embeddingSimilarity ?? undefined,
  };
}
