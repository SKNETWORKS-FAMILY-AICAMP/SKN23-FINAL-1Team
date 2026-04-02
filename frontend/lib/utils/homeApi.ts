import { HomeFilters, PropertyItem } from "@/lib/types/home";
import { buildPropertyQuery } from "@/lib/utils/buildPropertyQuery";

type PropertyResponse = {
  items: PropertyItem[];
  center: {
    lat: number;
    lng: number;
  } | null;
};

export async function fetchProperties(filters: HomeFilters) {
  const query = buildPropertyQuery(filters);

  const response = await fetch(`/api/properties?${query}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("매물 데이터를 불러오지 못했습니다.");
  }

  return (await response.json()) as PropertyResponse;
}
