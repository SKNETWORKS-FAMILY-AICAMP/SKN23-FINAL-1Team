const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function requestFavorite(path: string, options?: RequestInit) {
  const url = `${API_BASE_URL}${path}`;
  console.log("[favorite] API_BASE_URL =", API_BASE_URL);
  console.log("[favorite] request url =", url);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
      credentials: "include",
    });

    console.log("[favorite] status =", response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error("[favorite] response error body =", text);
      throw new Error(`즐겨찾기 요청 실패 (${response.status}): ${text}`);
    }

    return response.json();
  } catch (error) {
    console.error("[favorite] fetch 자체 실패", error);
    throw error;
  }
}

export type FavoriteListResponse = {
  items: {
    item_id: number;
    created_at?: string | null;
  }[];
};

export async function fetchFavorites(userId: number, signal?: AbortSignal) {
  return requestFavorite(`/favorites?user_id=${userId}`, {
    method: "GET",
    signal,
  }) as Promise<FavoriteListResponse>;
}

export async function addFavorite(itemId: number, userId: number) {
  return requestFavorite(`/favorites/${itemId}`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function removeFavorite(itemId: number, userId: number) {
  return requestFavorite(`/favorites/${itemId}`, {
    method: "DELETE",
    body: JSON.stringify({ user_id: userId }),
  });
}
