"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { ChevronLeft, ChevronUp, ChevronDown, Plus, X } from "lucide-react";
import Image from "next/image";
import Logo from "@/assets/Logo.png";

declare global {
  interface Window {
    daum: any;
  }
}

const ROOM_TYPES = ["오픈형원룸", "분리형원룸", "복층형원룸", "투룸"];
const DIRECTIONS = ["남향", "동향", "서향", "북향", "남동향", "남서향", "북동향", "북서향"];
const RESIDENCE_TYPES = ["오피스텔", "아파트", "빌라", "단독주택", "고시원"];

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

export default function RegisterPage() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(true);
  const [envOpen, setEnvOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    address: "",
    lat: "",
    lng: "",
    transaction_type: "monthly",
    deposit: "",
    rent: "",
    manage_cost: "",
    room_type: "오픈형원룸",
    floor: "",
    all_floors: "",
    area_m2: "",
    bathroom_count: "",
    room_direction: "",
    residence_type: "",
    approve_date: "",
    movein_date: "",
    description: "",
  });

  const [selectedOptions, setSelectedOptions] = useState<Record<string, boolean>>(
    Object.fromEntries(OPTIONS.map((o) => [o.key, false]))
  );
  const [selectedEnv, setSelectedEnv] = useState<Record<string, boolean>>(
    Object.fromEntries(ENVIRONMENTS.map((e) => [e.key, false]))
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addPhotos = useCallback((files: FileList | null) => {
    if (!files) return;
    const newPhotos = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 10 - photos.length)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 10));
  }, [photos.length]);

  const removePhoto = (idx: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addPhotos(e.dataTransfer.files);
  };

  const openAddressSearch = () => {
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = () => {
      new window.daum.Postcode({
        oncomplete: (data: any) => {
          const address = data.roadAddress || data.jibunAddress;
          setForm((prev) => ({ ...prev, address }));
          fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`, {
            headers: { Authorization: `KakaoAK ${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}` },
          })
            .then((r) => r.json())
            .then((d) => {
              const doc = d.documents?.[0];
              if (doc) {
                setForm((prev) => ({ ...prev, lat: doc.y, lng: doc.x }));
              }
            })
            .catch(console.error);
        },
      }).open();
    };
    document.head.appendChild(script);
  };

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (!form.title || !form.address || !form.lat || !form.lng || !form.deposit) {
      setError("필수 항목(제목, 주소, 보증금)을 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const body = {
        user_id: user?.user_id,
        title: form.title,
        address: form.address,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        transaction_type: form.transaction_type,
        deposit: parseInt(form.deposit),
        rent: form.rent ? parseInt(form.rent) : 0,
        manage_cost: form.manage_cost ? parseInt(form.manage_cost) : null,
        room_type: form.room_type,
        floor: form.floor || null,
        all_floors: form.all_floors || null,
        area_m2: form.area_m2 ? parseFloat(form.area_m2) : null,
        bathroom_count: form.bathroom_count ? parseInt(form.bathroom_count) : null,
        room_direction: form.room_direction || null,
        residence_type: form.residence_type || null,
        approve_date: form.approve_date || null,
        movein_date: form.movein_date || null,
        description: form.description || null,
        ...selectedOptions,
        ...selectedEnv,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.detail ?? "등록에 실패했습니다.");
        return;
      }

      router.push("/home");
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#A8896C] focus:outline-none transition-colors";
  const labelClass = "mb-1.5 block text-[13px] font-semibold text-stone-600";
  const sectionLabelClass = "mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400";
  const tagBase = "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer";
  const tagInactive = "border-stone-200 bg-white text-stone-500 hover:border-stone-300";
  const tagActive = "border-[#A8896C] bg-[#A8896C] text-white";

  return (
    <div className="flex h-screen flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,244,238,0.94)_100%)]">
      <header className="border-b border-stone-200/80 bg-white/70 backdrop-blur-xl">
        <div className="flex h-16 items-center px-4 md:px-6">
          <div className="flex w-14 items-center md:w-56">
            <Image src={Logo} alt="로고" width={100} height={32} className="hidden cursor-pointer object-contain md:block" onClick={() => router.push("/home")} />
            <button onClick={() => router.back()} className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800 md:hidden">
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
          <p className="flex-1 text-center text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400">매물 등록</p>
          <div className="flex w-14 justify-end md:w-56">
            <button onClick={() => router.back()} className="hidden items-center gap-2 rounded-full border border-stone-200/80 bg-white/65 px-4 py-2.5 text-sm font-semibold tracking-tight text-stone-500 shadow-sm backdrop-blur-md transition-all hover:text-stone-800 md:inline-flex">
              돌아가기 →
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 md:px-6">

          {/* 사진 등록 */}
          <div className="rounded-[20px] border border-stone-200/80 bg-white/80 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className={sectionLabelClass}>사진 등록</p>
            <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => addPhotos(e.target.files)} />
            {photos.length === 0 ? (
              <div
                ref={dropZoneRef}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-10 transition-colors ${isDragging ? "border-[#A8896C] bg-[#A8896C]/5" : "border-stone-200 hover:border-stone-300"}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
                  <Plus className="h-6 w-6 text-stone-400" />
                </div>
                <p className="text-sm font-semibold text-stone-600">사진을 드래그하거나 클릭해서 추가</p>
                <p className="text-xs text-stone-400">JPG, PNG 최대 10장</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-stone-200">
                      <img src={photo.preview} alt="" className="h-full w-full object-cover" />
                      <button onClick={() => removePhoto(idx)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 10 && (
                    <button onClick={() => fileInputRef.current?.click()} className="flex h-20 w-20 flex-shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-200 hover:border-stone-300">
                      <Plus className="h-5 w-5 text-stone-400" />
                      <span className="text-[11px] text-stone-400">추가</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-stone-400">{photos.length}/10장</p>
              </div>
            )}
          </div>

          {/* 기본 정보 */}
          <div className="rounded-[20px] border border-stone-200/80 bg-white/80 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className={sectionLabelClass}>기본 정보</p>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>매물 제목 *</label>
                <input name="title" value={form.title} onChange={handleChange} className={inputClass} placeholder="예) 강남역 도보 5분, 풀옵션 원룸" />
              </div>
              <div>
                <label className={labelClass}>주소 *</label>
                <div className="flex gap-2">
                  <input name="address" value={form.address} onChange={handleChange} className={inputClass} placeholder="주소를 검색해주세요" readOnly onClick={openAddressSearch} />
                  <button onClick={openAddressSearch} className="shrink-0 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 hover:border-stone-300 hover:text-stone-900">
                    검색
                  </button>
                </div>
                {form.lat && form.lng && (
                  <p className="mt-1 text-xs text-stone-400">위도 {parseFloat(form.lat).toFixed(6)}, 경도 {parseFloat(form.lng).toFixed(6)}</p>
                )}
              </div>
            </div>
          </div>

          {/* 거래 정보 */}
          <div className="rounded-[20px] border border-stone-200/80 bg-white/80 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className={sectionLabelClass}>거래 정보</p>
            <div className="mb-4 flex gap-2">
              {["monthly", "jeonse"].map((type) => (
                <button key={type} onClick={() => setForm((p) => ({ ...p, transaction_type: type }))}
                  className={`${tagBase} ${form.transaction_type === type ? tagActive : tagInactive}`}>
                  {type === "monthly" ? "월세" : "전세"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>보증금 (만원) *</label>
                <input name="deposit" value={form.deposit} onChange={handleChange} className={inputClass} placeholder="1000" type="number" />
              </div>
              {form.transaction_type === "monthly" && (
                <div>
                  <label className={labelClass}>월세 (만원)</label>
                  <input name="rent" value={form.rent} onChange={handleChange} className={inputClass} placeholder="50" type="number" />
                </div>
              )}
            </div>
            <div className="mt-3">
              <label className={labelClass}>관리비 (만원)</label>
              <input name="manage_cost" value={form.manage_cost} onChange={handleChange} className={inputClass} placeholder="5" type="number" />
            </div>
          </div>

          {/* 방 정보 */}
          <div className="rounded-[20px] border border-stone-200/80 bg-white/80 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className={sectionLabelClass}>방 정보</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {ROOM_TYPES.map((type) => (
                <button key={type} onClick={() => setForm((p) => ({ ...p, room_type: type }))}
                  className={`${tagBase} ${form.room_type === type ? tagActive : tagInactive}`}>
                  {type}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div><label className={labelClass}>층수</label><input name="floor" value={form.floor} onChange={handleChange} className={inputClass} placeholder="3" /></div>
              <div><label className={labelClass}>전체 층수</label><input name="all_floors" value={form.all_floors} onChange={handleChange} className={inputClass} placeholder="5" /></div>
              <div><label className={labelClass}>면적 (m²)</label><input name="area_m2" value={form.area_m2} onChange={handleChange} className={inputClass} placeholder="33" type="number" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClass}>욕실 수</label>
                <input name="bathroom_count" value={form.bathroom_count} onChange={handleChange} className={inputClass} placeholder="1" type="number" />
              </div>
              <div>
                <label className={labelClass}>방향</label>
                <select name="room_direction" value={form.room_direction} onChange={handleChange} className={inputClass}>
                  <option value="">선택</option>
                  {DIRECTIONS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClass}>주거 형태</label>
                <select name="residence_type" value={form.residence_type} onChange={handleChange} className={inputClass}>
                  <option value="">선택</option>
                  {RESIDENCE_TYPES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>사용 승인일</label>
                <input name="approve_date" value={form.approve_date} onChange={handleChange} className={inputClass} type="date" />
              </div>
            </div>
            <div>
              <label className={labelClass}>입주 가능일</label>
              <input name="movein_date" value={form.movein_date} onChange={handleChange} className={inputClass} type="date" />
            </div>
          </div>

          {/* 옵션 */}
          <div className="rounded-[20px] border border-stone-200/80 bg-white/80 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <button onClick={() => setOptionsOpen((p) => !p)} className="flex w-full items-center justify-between">
              <p className={sectionLabelClass + " mb-0"}>옵션</p>
              {optionsOpen ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
            </button>
            {optionsOpen && (
              <div className="mt-4 flex flex-wrap gap-2">
                {OPTIONS.map((opt) => (
                  <button key={opt.key} onClick={() => setSelectedOptions((p) => ({ ...p, [opt.key]: !p[opt.key] }))}
                    className={`${tagBase} ${selectedOptions[opt.key] ? tagActive : tagInactive}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 주변 환경 */}
          <div className="rounded-[20px] border border-stone-200/80 bg-white/80 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <button onClick={() => setEnvOpen((p) => !p)} className="flex w-full items-center justify-between">
              <p className={sectionLabelClass + " mb-0"}>주변 환경</p>
              {envOpen ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
            </button>
            {envOpen && (
              <div className="mt-4 flex flex-wrap gap-2">
                {ENVIRONMENTS.map((env) => (
                  <button key={env.key} onClick={() => setSelectedEnv((p) => ({ ...p, [env.key]: !p[env.key] }))}
                    className={`${tagBase} ${selectedEnv[env.key] ? tagActive : tagInactive}`}>
                    {env.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 상세 설명 */}
          <div className="rounded-[20px] border border-stone-200/80 bg-white/80 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className={sectionLabelClass}>상세 설명</p>
            <textarea name="description" value={form.description} onChange={handleChange}
              className={`${inputClass} h-28 resize-none`}
              placeholder="매물에 대한 상세한 설명을 입력해주세요." />
          </div>

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

          <button onClick={handleSubmit} disabled={isSubmitting}
            className="w-full cursor-pointer rounded-2xl bg-[#A8896C] py-4 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? "등록 중..." : "매물 등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
