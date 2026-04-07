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
