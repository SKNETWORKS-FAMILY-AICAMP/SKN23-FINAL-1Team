"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, Trash2, Pencil, X, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePendingListingStore } from "@/store/pendingListingStore";

const OPTIONS = [
  { key: "has_air_con", label: "에어컨" },
  { key: "has_fridge", label: "냉장고" },
  { key: "has_washer", label: "세탁기" },
  { key: "has_gas_stove", label: "가스레인지" },
  { key: "has_induction", label: "인덕션" },
  { key: "has_microwave", label: "전자레인지" },
  { key: "has_desk", label: "책상" },
  { key: "has_bed", label: "침대" },
  { key: "has_closet", label: "옷장" },
  { key: "has_shoe_rack", label: "신발장" },
  { key: "has_bookcase", label: "책장" },
  { key: "has_sink", label: "싱크대" },
  { key: "has_parking", label: "주차" },
  { key: "has_elevator", label: "엘리베이터" },
];

const ENVIRONMENTS = [
  { key: "is_subway_area", label: "역세권" },
  { key: "is_park_area", label: "공세권" },
  { key: "is_school_area", label: "학세권" },
  { key: "is_convenient_area", label: "슬세권" },
];

const DISTANCES = [
  { key: "dist_subway", label: "지하철역 (m)" },
  { key: "dist_bus", label: "버스정류장 (m)" },
  { key: "dist_conv", label: "편의점 (m)" },
  { key: "dist_mart", label: "마트 (m)" },
  { key: "dist_laundry", label: "세탁소 (m)" },
];

interface RoomImage {
  id: number;
  url: string;
  is_main: boolean;
}

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
  images: RoomImage[];
  description: string | null;
  has_air_con: boolean;
  has_fridge: boolean;
  has_washer: boolean;
  has_gas_stove: boolean;
  has_induction: boolean;
  has_microwave: boolean;
  has_desk: boolean;
  has_bed: boolean;
  has_closet: boolean;
  has_shoe_rack: boolean;
  has_bookcase: boolean;
  has_sink: boolean;
  has_parking: boolean;
  has_elevator: boolean;
  is_subway_area: boolean;
  is_park_area: boolean;
  is_school_area: boolean;
  is_convenient_area: boolean;
  dist_subway: number | null;
  dist_bus: number | null;
  dist_conv: number | null;
  dist_mart: number | null;
  dist_laundry: number | null;
}

interface EditForm {
  title: string;
  deposit: string;
  rent: string;
  manage_cost: string;
  description: string;
  status: string;
  has_air_con: boolean;
  has_fridge: boolean;
  has_washer: boolean;
  has_gas_stove: boolean;
  has_induction: boolean;
  has_microwave: boolean;
  has_desk: boolean;
  has_bed: boolean;
  has_closet: boolean;
  has_shoe_rack: boolean;
  has_bookcase: boolean;
  has_sink: boolean;
  has_parking: boolean;
  has_elevator: boolean;
  is_subway_area: boolean;
  is_park_area: boolean;
  is_school_area: boolean;
  is_convenient_area: boolean;
  dist_subway: string;
  dist_bus: string;
  dist_conv: string;
  dist_mart: string;
  dist_laundry: string;
}

const inputClass = "w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none";
const tagBase = "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer";
const tagActive = "border-[#A8896C] bg-[#A8896C] text-white";
const tagInactive = "border-stone-200 bg-white text-stone-500 hover:border-stone-400";

export function BrokerSection({ userId }: { userId: number }) {
  const router = useRouter();
  const setPendingListing = usePendingListingStore((state) => state.setPendingListing);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editImages, setEditImages] = useState<RoomImage[]>([]);
  const [newPhotos, setNewPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const fetchMyRooms = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/rooms/my-rooms?user_id=${userId}`);
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
      const res = await fetch(`${apiUrl}/api/rooms/my-rooms/${itemId}?user_id=${userId}`, { method: "DELETE" });
      if (!res.ok) return;
      setRooms((prev) => prev.filter((r) => r.item_id !== itemId));
      setDeleteConfirm(null);
    } catch {
      console.error("삭제 실패");
    }
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setEditImages([...room.images]);
    setNewPhotos([]);
    setEditForm({
      title: room.title ?? "",
      deposit: String(room.deposit),
      rent: String(room.rent),
      manage_cost: String(room.manage_cost ?? ""),
      description: room.description ?? "",
      status: room.status,
      has_air_con: room.has_air_con,
      has_fridge: room.has_fridge,
      has_washer: room.has_washer,
      has_gas_stove: room.has_gas_stove,
      has_induction: room.has_induction,
      has_microwave: room.has_microwave,
      has_desk: room.has_desk,
      has_bed: room.has_bed,
      has_closet: room.has_closet,
      has_shoe_rack: room.has_shoe_rack,
      has_bookcase: room.has_bookcase,
      has_sink: room.has_sink,
      has_parking: room.has_parking,
      has_elevator: room.has_elevator,
      is_subway_area: room.is_subway_area,
      is_park_area: room.is_park_area,
      is_school_area: room.is_school_area,
      is_convenient_area: room.is_convenient_area,
      dist_subway: String(room.dist_subway ?? ""),
      dist_bus: String(room.dist_bus ?? ""),
      dist_conv: String(room.dist_conv ?? ""),
      dist_mart: String(room.dist_mart ?? ""),
      dist_laundry: String(room.dist_laundry ?? ""),
    });
  };

  const handleEditOpen = (room: Room, e: React.MouseEvent) => {
    e.stopPropagation();
    openEditModal(room);
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!editingRoom) return;
    try {
      const res = await fetch(
        `${apiUrl}/api/rooms/my-rooms/${editingRoom.item_id}/images/${imageId}?user_id=${userId}`,
        { method: "DELETE" }
      );
      if (!res.ok) return;
      setEditImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch {
      console.error("이미지 삭제 실패");
    }
  };

  const addNewPhotos = useCallback((files: FileList | null) => {
    if (!files) return;
    const photos = Array.from(files)
      .filter((f) => f.type === "image/jpeg" || f.type === "image/png")
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setNewPhotos((prev) => [...prev, ...photos].slice(0, 10));
  }, []);

  const handleSave = async () => {
    if (!editingRoom || !editForm) return;
    setSaving(true);
    try {
      for (let idx = 0; idx < newPhotos.length; idx++) {
        const photo = newPhotos[idx];
        const formData = new FormData();
        formData.append("file", photo.file);
        formData.append("item_id", String(editingRoom.item_id));
        formData.append("index", String(editImages.length + idx));
        const uploadRes = await fetch(`${apiUrl}/api/rooms/upload-image`, {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          await fetch(`${apiUrl}/api/rooms/update-images`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              item_id: editingRoom.item_id,
              image_thumbnail: editImages.length === 0 && idx === 0 ? uploadData.url : undefined,
              image_urls: [uploadData.url],
            }),
          });
        }
      }

      const res = await fetch(`${apiUrl}/api/rooms/my-rooms/${editingRoom.item_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          title: editForm.title || null,
          deposit: parseInt(editForm.deposit) || 0,
          rent: parseInt(editForm.rent) || 0,
          manage_cost: editForm.manage_cost ? parseInt(editForm.manage_cost) : null,
          description: editForm.description || null,
          status: editForm.status,
          has_air_con: editForm.has_air_con,
          has_fridge: editForm.has_fridge,
          has_washer: editForm.has_washer,
          has_gas_stove: editForm.has_gas_stove,
          has_induction: editForm.has_induction,
          has_microwave: editForm.has_microwave,
          has_desk: editForm.has_desk,
          has_bed: editForm.has_bed,
          has_closet: editForm.has_closet,
          has_shoe_rack: editForm.has_shoe_rack,
          has_bookcase: editForm.has_bookcase,
          has_sink: editForm.has_sink,
          has_parking: editForm.has_parking,
          has_elevator: editForm.has_elevator,
          is_subway_area: editForm.is_subway_area,
          is_park_area: editForm.is_park_area,
          is_school_area: editForm.is_school_area,
          is_convenient_area: editForm.is_convenient_area,
          dist_subway: editForm.dist_subway ? parseInt(editForm.dist_subway) : null,
          dist_bus: editForm.dist_bus ? parseInt(editForm.dist_bus) : null,
          dist_conv: editForm.dist_conv ? parseInt(editForm.dist_conv) : null,
          dist_mart: editForm.dist_mart ? parseInt(editForm.dist_mart) : null,
          dist_laundry: editForm.dist_laundry ? parseInt(editForm.dist_laundry) : null,
        }),
      });
      if (!res.ok) return;
      await fetchMyRooms();
      setEditingRoom(null);
      setEditForm(null);
      setNewPhotos([]);
    } catch {
      console.error("수정 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleRoomClick = (room: Room) => {
    if (room.status === "INACTIVE") {
      openEditModal(room);
      return;
    }
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
              className={`flex items-center gap-4 rounded-[20px] border border-stone-200/80 bg-white/80 p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)] cursor-pointer transition-all duration-200 ${
                room.status === "INACTIVE"
                  ? "opacity-60 hover:opacity-80"
                  : "hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
              }`}
            >
              <div className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100">
                {room.image_thumbnail ? (
                  <img src={room.image_thumbnail} alt={room.title ?? ""} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Building2 className="h-8 w-8 text-stone-300" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    room.status === "ACTIVE" ? "bg-green-100 text-green-600" : "bg-stone-100 text-stone-400"
                  }`}>
                    {room.status === "ACTIVE" ? "활성" : "거래완료"}
                  </span>
                  {room.room_type && <span className="text-[10px] text-stone-400">{room.room_type}</span>}
                </div>
                <p className="mt-1.5 truncate text-base font-semibold text-stone-800">{room.title ?? "제목 없음"}</p>
                <p className="truncate text-sm text-stone-400">{room.address}</p>
                <p className="mt-1 text-sm font-medium text-stone-600">
                  {room.service_type === "월세"
                    ? `보증금 ${room.deposit.toLocaleString()}만 / 월세 ${room.rent.toLocaleString()}만`
                    : `전세 ${room.deposit.toLocaleString()}만`}
                  {room.area_m2 && ` · ${room.area_m2}m²`}
                </p>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                  <button
                    onMouseEnter={() => setTooltip(`edit-${room.item_id}`)}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={(e) => handleEditOpen(room, e)}
                    className="rounded-xl border border-stone-200 p-2 text-stone-400 hover:border-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {tooltip === `edit-${room.item_id}` && (
                    <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-800 px-3 py-1.5 text-[11px] text-white shadow-lg z-10">
                      매물 수정
                      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-stone-800" />
                    </div>
                  )}
                </div>

                <div className="relative">
                  {deleteConfirm === room.item_id ? (
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-xs text-stone-500">삭제할까요?</p>
                      <div className="flex gap-2">
                        <button onClick={(e) => handleDelete(room.item_id, e)} className="text-xs font-semibold text-red-500 hover:text-red-600 cursor-pointer">확인</button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }} className="text-xs font-semibold text-stone-400 hover:text-stone-600 cursor-pointer">취소</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onMouseEnter={() => setTooltip(`delete-${room.item_id}`)}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(room.item_id); }}
                        className="rounded-xl border border-stone-200 p-2 text-stone-400 hover:border-red-200 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      {tooltip === `delete-${room.item_id}` && (
                        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-800 px-3 py-1.5 text-[11px] text-white shadow-lg z-10">
                          매물 삭제
                          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-stone-800" />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 수정 모달 */}
      {editingRoom && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setEditingRoom(null); setEditForm(null); setNewPhotos([]); }}>
          <div
            className="w-full max-w-md rounded-[20px] border border-stone-200/80 bg-white p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-stone-900">매물 수정</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-stone-100 rounded-full p-1">
                  <button
                    onClick={() => setEditForm((p) => p ? ({ ...p, status: "ACTIVE" }) : p)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-all ${
                      editForm.status === "ACTIVE"
                        ? "bg-green-100 text-green-600"
                        : "text-stone-400"
                    }`}
                  >
                    활성
                  </button>
                  <button
                    onClick={() => setEditForm((p) => p ? ({ ...p, status: "INACTIVE" }) : p)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-all ${
                      editForm.status === "INACTIVE"
                        ? "bg-red-100 text-red-500"
                        : "text-stone-400"
                    }`}
                  >
                    거래완료
                  </button>
                </div>
                <button onClick={() => { setEditingRoom(null); setEditForm(null); setNewPhotos([]); }} className="cursor-pointer rounded-full p-1 text-stone-400 hover:text-stone-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold text-stone-500">사진</p>
                <div className="flex flex-wrap gap-2">
                  {editImages.map((img) => (
                    <div key={img.id} className="relative h-20 w-20 overflow-hidden rounded-xl border border-stone-200">
                      {img.is_main && (
                        <span className="absolute left-1 top-1 rounded bg-stone-800/70 px-1 py-0.5 text-[9px] font-bold text-white z-10">대표</span>
                      )}
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer z-10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {newPhotos.map((photo, idx) => (
                    <div key={`new-${idx}`} className="relative h-20 w-20 overflow-hidden rounded-xl border border-[#A8896C]/40">
                      <span className="absolute left-1 top-1 rounded bg-[#A8896C]/70 px-1 py-0.5 text-[9px] font-bold text-white z-10">새 사진</span>
                      <img src={photo.preview} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => setNewPhotos((p) => p.filter((_, i) => i !== idx))}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer z-10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-20 w-20 flex-shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-200 hover:border-stone-300"
                  >
                    <Plus className="h-5 w-5 text-stone-400" />
                    <span className="text-[11px] text-stone-400">추가</span>
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  multiple
                  className="hidden"
                  onChange={(e) => addNewPhotos(e.target.files)}
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-stone-500">제목</p>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => p ? ({ ...p, title: e.target.value }) : p)}
                  className={inputClass}
                  placeholder="매물 제목을 입력해주세요."
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-stone-500">가격</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 text-xs text-stone-400">보증금 (만원)</p>
                    <input type="number" value={editForm.deposit} onChange={(e) => setEditForm((p) => p ? ({ ...p, deposit: e.target.value }) : p)} className={inputClass} />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-stone-400">월세 (만원)</p>
                    <input type="number" value={editForm.rent} onChange={(e) => setEditForm((p) => p ? ({ ...p, rent: e.target.value }) : p)} className={inputClass} />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="mb-1 text-xs text-stone-400">관리비 (만원)</p>
                  <input type="number" value={editForm.manage_cost} onChange={(e) => setEditForm((p) => p ? ({ ...p, manage_cost: e.target.value }) : p)} className={inputClass} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-stone-500">옵션</p>
                <div className="flex flex-wrap gap-2">
                  {OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setEditForm((p) => p ? ({ ...p, [opt.key]: !p[opt.key as keyof EditForm] }) : p)}
                      className={`${tagBase} ${editForm[opt.key as keyof EditForm] ? tagActive : tagInactive}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-stone-500">주변 환경</p>
                <div className="flex flex-wrap gap-2">
                  {ENVIRONMENTS.map((env) => (
                    <button
                      key={env.key}
                      onClick={() => setEditForm((p) => p ? ({ ...p, [env.key]: !p[env.key as keyof EditForm] }) : p)}
                      className={`${tagBase} ${editForm[env.key as keyof EditForm] ? tagActive : tagInactive}`}
                    >
                      {env.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-stone-500">주변 시설 거리</p>
                <div className="grid grid-cols-2 gap-2">
                  {DISTANCES.map((dist) => (
                    <div key={dist.key}>
                      <p className="mb-1 text-xs text-stone-400">{dist.label}</p>
                      <input
                        type="number"
                        value={editForm[dist.key as keyof EditForm] as string}
                        onChange={(e) => setEditForm((p) => p ? ({ ...p, [dist.key]: e.target.value }) : p)}
                        className={inputClass}
                        placeholder="예) 300"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-stone-500">상세 설명</p>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => p ? ({ ...p, description: e.target.value }) : p)}
                  className={`${inputClass} h-24 resize-none`}
                  placeholder="상세 설명을 입력해주세요."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  onClick={() => { setEditingRoom(null); setEditForm(null); setNewPhotos([]); }}
                  className="rounded-full border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-500 hover:border-stone-400 cursor-pointer"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-full bg-stone-800 border border-stone-800 px-4 py-2 text-xs font-semibold text-white hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {saving ? "저장 중..." : "수정 완료"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}