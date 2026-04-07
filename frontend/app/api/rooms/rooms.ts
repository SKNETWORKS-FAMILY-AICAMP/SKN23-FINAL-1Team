import { RoomListApiResponse } from "@/types/rooms_type";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function fetchItems(params: {
  offset: number;
  limit: number;
  search?: string;
  transactionType?: string;
  roomType?: string;
}): Promise<RoomListApiResponse> {
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
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("매물 데이터를 불러오지 못했습니다.");
  }

  return response.json();
}
