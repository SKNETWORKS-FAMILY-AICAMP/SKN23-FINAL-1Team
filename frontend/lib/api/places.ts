export type PlaceType = "district" | "dong" | "subway_station";

export interface PlaceSuggestion {
  id: string;
  type: PlaceType;
  name: string;
  display_name: string;
  sido?: string | null;
  sigungu?: string | null;
  dong?: string | null;
  lines: string[];
  lat?: number | null;
  lng?: number | null;
}

export async function fetchPlaceSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const params = new URLSearchParams({
    q: trimmedQuery,
    limit: "8",
  });

  const response = await fetch(`/api/places/search?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Place search failed.");
  }

  const data = await response.json();
  return Array.isArray(data.items) ? data.items : [];
}
