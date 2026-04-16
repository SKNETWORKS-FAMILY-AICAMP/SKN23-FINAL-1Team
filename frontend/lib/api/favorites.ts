export type FavoriteListResponse = {
  items: {
    item_id: number;
    created_at?: string | null;
  }[];
};

async function requestFavorite<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Favorite request failed (${response.status}): ${text}`);
  }

  const text = await response.text();

  if (!text) {
    return null as T;
  }

  return JSON.parse(text) as T;
}

export async function fetchFavorites(userId: number, signal?: AbortSignal) {
  return requestFavorite<FavoriteListResponse>(
    `/api/favorites?user_id=${userId}`,
    {
      method: "GET",
      signal,
    },
  );
}

export async function addFavorite(itemId: number, userId: number) {
  return requestFavorite("/api/favorites", {
    method: "POST",
    body: JSON.stringify({
      item_id: itemId,
      user_id: userId,
    }),
  });
}

export async function removeFavorite(itemId: number, userId: number) {
  return requestFavorite("/api/favorites", {
    method: "DELETE",
    body: JSON.stringify({
      item_id: itemId,
      user_id: userId,
    }),
  });
}
