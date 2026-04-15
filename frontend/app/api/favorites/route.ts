const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function requestFavorite(path: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "즐겨찾기 요청에 실패했습니다.");
  }

  return response.json();
}

export type FavoriteListResponse = {
  items: {
    item_id: number;
    created_at?: string | null;
  }[];
};

export async function fetchFavorites(signal?: AbortSignal) {
  return requestFavorite("/favorites", {
    method: "GET",
    signal,
  }) as Promise<FavoriteListResponse>;
}

export async function addFavorite(itemId: number) {
  return requestFavorite(`/favorites/${itemId}`, {
    method: "POST",
  });
}

export async function removeFavorite(itemId: number) {
  return requestFavorite(`/favorites/${itemId}`, {
    method: "DELETE",
  });
}
