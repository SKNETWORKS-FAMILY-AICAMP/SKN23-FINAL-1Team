import { fetchItems } from "@/lib/api/rooms";
import type { RoomApiResponse } from "@/types/rooms_type";
import type { HomeFilters, PropertyItem } from "@/types/home";

interface FetchPropertiesResult {
  items: PropertyItem[];
  center: { lat: number; lng: number } | null;
}

const ALL_LABEL = "\uc804\uccb4";

function isAllFilter(value: string) {
  return !value || value === ALL_LABEL || value.toLowerCase() === "all";
}

function formatMoney(value: number | null | undefined) {
  if (!value) return "";
  return `${value}\ub9cc\uc6d0`;
}

function formatPrice(item: RoomApiResponse) {
  if (item.rent <= 0) return "\uc804\uc138";
  return "\uc6d4\uc138";
}

function toPropertyItem(item: RoomApiResponse): PropertyItem {
  return {
    id: String(item.item_id),
    item_id: item.item_id,
    title: item.title ?? "",
    price: formatPrice(item),
    deposit: formatMoney(item.deposit),
    monthlyRent: formatMoney(item.rent),
    address: item.address,
    size: item.area_m2 ? `${item.area_m2}m2` : "",
    floor: item.floor ?? "",
    images: item.image_thumbnail ? [item.image_thumbnail] : [],
    lat: item.lat,
    lng: item.lng,
    structure: item.room_type ?? "",
    options: [],
  };
}

function getCenter(items: PropertyItem[]) {
  if (items.length === 0) return null;

  const total = items.reduce(
    (acc, item) => ({
      lat: acc.lat + item.lat,
      lng: acc.lng + item.lng,
    }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: total.lat / items.length,
    lng: total.lng / items.length,
  };
}

export async function fetchProperties(
  filters: HomeFilters,
): Promise<FetchPropertiesResult> {
  const response = await fetchItems({
    search: filters.region,
    transactionType: isAllFilter(filters.dealType) ? "all" : filters.dealType,
    structure: isAllFilter(filters.structure) ? [] : [filters.structure],
    options: filters.option,
    limit: 50,
  });

  const items = response.items.map(toPropertyItem);

  return {
    items,
    center: getCenter(items),
  };
}
