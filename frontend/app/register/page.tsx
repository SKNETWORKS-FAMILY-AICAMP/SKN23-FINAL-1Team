"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useRegisterStore } from "@/store/registerStore";
import { ChevronUp, ChevronDown } from "lucide-react";

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

const inputClass = "w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm focus:border-stone-400 focus:outline-none";
const labelClass = "mb-1 block text-xs font-semibold text-stone-500";
const sectionLabelClass = "mb-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400";
const tagBase = "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150";
const tagActive = "border-stone-800 bg-stone-800 text-white";
const tagInactive = "border-stone-200 bg-white text-stone-500 hover:border-stone-400";

export default function RegisterPage() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuthStore();
  const setRegisterForm = useRegisterStore((state) => state.setForm);

  const [optionsOpen, setOptionsOpen] = useState(true);
  const [envOpen, setEnvOpen] = useState(true);
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

  const handleNext = () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (!form.title || !form.address || !form.lat || !form.lng || !form.deposit) {
      setError("필수 항목(제목, 주소, 보증금)을 모두 입력해주세요.");
      return;
    }

    setRegisterForm({
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
      has_air_con: selectedOptions.has_air_con,
      has_fridge: selectedOptions.has_fridge,
      has_washer: selectedOptions.has_washer,
      has_gas_stove: selectedOptions.has_gas_stove,
      has_induction: selectedOptions.has_induction,
      has_microwave: selectedOptions.has_microwave,
      has_desk: selectedOptions.has_desk,
      has_bed: selectedOptions.has_bed,
      has_closet: selectedOptions.has_closet,
      has_shoe_rack: selectedOptions.has_shoe_rack,
      has_bookcase: selectedOptions.has_bookcase,
      has_sink: selectedOptions.has_sink,
      has_parking: selectedOptions.has_parking,
      has_elevator: selectedOptions.has_elevator,
      is_subway_area: selectedEnv.is_subway_area,
      is_park_area: selectedEnv.is_park_area,
      is_school_area: selectedEnv.is_school_area,
      is_convenient_area: selectedEnv.is_convenient_area,
    });

    router.push("/register-photo");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,244,238,0.94)_100%)]">
      <header className="border-b border-stone-200/80 bg-white/70 backdrop-blur-xl">
        <div className="flex h-16 items-center px-4 md:px-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-800">
            ← 돌아가기
          </button>
          <p className="flex-1 text-center text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400">매물 등록</p>
          <div className="w-20" />
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="space-y-4">

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

          <button
            onClick={handleNext}
            className="w-full cursor-pointer rounded-2xl bg-[#A8896C] py-4 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            다음 →
          </button>
        </div>
      </div>
    </div>
  );
}