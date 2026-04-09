import { RoomListApiResponse } from "@/types/rooms_type";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const MAX_RETRIES = 1;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchItems(params: {
  offset: number;
  limit: number;
  search?: string;
  transactionType?: string;
  roomType?: "원룸" | "투룸" | "all";
  structure?: string;
  price?: number | "all";
  size?: number | "all";
  sizeUnit?: "m2" | "pyeong";
  options?: string[];
}): Promise<RoomListApiResponse> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offset: params.offset,
          limit: params.limit,
          search: params.search ?? "",
          transaction_type: params.transactionType ?? "all",
          room_type: params.roomType ?? "all",
          structure: params.structure ?? "all",
          price: params.price ?? "all",
          size: params.size ?? "all",
          size_unit: params.sizeUnit ?? "m2",
          options: params.options ?? [],
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("매물 데이터를 불러오지 못했습니다.");
      }

      return response.json();
    } catch (error) {
      lastError = error;

      if (attempt === MAX_RETRIES) {
        break;
      }

      await delay(500);
    }
  }

  throw lastError ?? new Error("매물 데이터를 불러오지 못했습니다.");
}
