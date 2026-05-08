"use client";

import { useEffect, useState } from "react";
import { Building2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePendingListingStore } from "@/store/pendingListingStore";

interface Room {
  item_id: number;
  title: string;
  address: string;
  deposit: number;
  rent: number;
  manage_cost: number | null;
  room_type: string | null;
  area_m2: number | null;
  floor: string | null;
  status: string;
  image_thumbnail: string | null;
  service_type: string | null;
  lat: number | null;
  lng: number | null;
}

export function BrokerSection({ userId }: { userId: number }) {
  const router = useRouter();
  const setPendingListing = usePendingListingStore((state) => state.setPendingListing);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchMyRooms = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/rooms/my-rooms?user_id=${userId}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setRooms(data);
    } catch {
      console.error("매물 불러오기 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRooms();
  }, [userId]);

  const handleDelete = async (itemId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/rooms/my-rooms/${itemId}?user_id=${userId}`,
        { method: "DELETE" }
      );
      if (!res.ok) return;
      setRooms((prev) => prev.filter((r) => r.item_id !== itemId));
      setDeleteConfirm(null);
    } catch {
      console.error("삭제 실패");
    }
  };

  const handleRoomClick = (room: Room) => {
    const priceText = room.service_type === "월세"
      ? `${room.deposit}/${room.rent}`
      : `전세 ${room.deposit}`;

    setPendingListing({
      id: String(room.item_id),
      title: room.title ?? "",
      price: priceText,
      deposit: String(room.deposit),
      monthlyRent: String(room.rent),
      address: room.address,
      size: room.area_m2 ? `${room.area_m2}m²` : "",
      floor: room.floor ? `${room.floor}층` : "",
      images: room.image_thumbnail ? [room.image_thumbnail] : [],
      lat: room.lat ?? 0,
      lng: room.lng ?? 0,
      structure: room.room_type ?? "",
      options: [],
    });
    router.push("/home");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-stone-400">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400 md:mb-4">
        중개사 매물관리
      </p>

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[20px] border border-stone-200/80 bg-white/80 py-16">
          <Building2 className="mb-3 h-8 w-8 text-stone-300" />
          <p className="text-sm font-medium text-stone-400">등록한 매물이 없어요</p>
          <p className="mt-1 text-xs text-stone-300">매물 등록 버튼을 눌러 등록해보세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <div
              key={room.item_id}
              onClick={() => handleRoomClick(room)}
              className="flex items-center gap-4 rounded-[20px] border border-stone-200/80 bg-white/80 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] cursor-pointer hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-200"
            >
              {/* 썸네일 */}
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100">
                {room.image_thumbnail ? (
                  <img
                    src={room.image_thumbnail}
                    alt={room.title ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Building2 className="h-6 w-6 text-stone-300" />
                  </div>
                )}
              </div>

              {/* 정보 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      room.status === "ACTIVE"
                        ? "bg-green-100 text-green-600"
                        : "bg-stone-100 text-stone-400"
                    }`}
                  >
                    {room.status === "ACTIVE" ? "활성" : "비활성"}
                  </span>
                  {room.room_type && (
                    <span className="text-[10px] text-stone-400">{room.room_type}</span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-stone-800">
                  {room.title ?? "제목 없음"}
                </p>
                <p className="truncate text-xs text-stone-400">{room.address}</p>
                <p className="mt-1 text-xs font-medium text-stone-600">
                  {room.service_type === "월세"
                    ? `보증금 ${room.deposit.toLocaleString()}만 / 월세 ${room.rent.toLocaleString()}만`
                    : `전세 ${room.deposit.toLocaleString()}만`}
                  {room.area_m2 && ` · ${room.area_m2}m²`}
                </p>
              </div>

              {/* 삭제 */}
              <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {deleteConfirm === room.item_id ? (
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-xs text-stone-500">삭제할까요?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleDelete(room.item_id, e)}
                        className="text-xs font-semibold text-red-500 hover:text-red-600 cursor-pointer"
                      >
                        확인
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                        className="text-xs font-semibold text-stone-400 hover:text-stone-600 cursor-pointer"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(room.item_id); }}
                    className="rounded-xl border border-stone-200 p-2 text-stone-400 hover:border-red-200 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}