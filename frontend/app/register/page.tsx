"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useRegisterStore } from "@/store/registerStore";
import { toast } from "@/hooks/use-toast";

declare global {
  interface Window { daum: any; }
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
  { key: "is_subway_area", label: "역세권", tooltip: "지하철역 도보 10분 이내" },
  { key: "is_park_area", label: "공세권", tooltip: "공원이 가까운 주거 환경" },
  { key: "is_school_area", label: "학세권", tooltip: "학교·학원가가 가까운 환경" },
  { key: "is_convenient_area", label: "슬세권", tooltip: "슬리퍼 신고 편의시설 이용 가능" },
];

const inputClass = "w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm focus:border-stone-400 focus:outline-none";
const labelClass = "mb-1 block text-xs font-semibold text-stone-500";
const tagBase = "rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-150 cursor-pointer";
const tagActive = "border-[#A8896C] bg-[#A8896C] text-white";
const tagInactive = "border-stone-200 bg-white text-stone-500 hover:border-stone-400";
const btnBase = "rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-150 cursor-pointer";

type SectionId = "basic" | "transaction" | "room" | "options" | "description";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "basic", label: "기본 정보" },
  { id: "transaction", label: "거래 정보" },
  { id: "room", label: "방 정보" },
  { id: "options", label: "옵션 · 환경" },
  { id: "description", label: "상세 설명" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuthStore();
  const setRegisterForm = useRegisterStore((state) => state.setForm);
  const [activeSection, setActiveSection] = useState<SectionId>("basic");
  const [tooltip, setTooltip] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    address: "",
    address_detail: "",
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
              if (doc) setForm((prev) => ({ ...prev, lat: doc.y, lng: doc.x }));
            })
            .catch(console.error);
        },
      }).open();
    };
    document.head.appendChild(script);
  };

  const currentIndex = SECTIONS.findIndex((s) => s.id === activeSection);

  const handleNext = () => {
    if (currentIndex < SECTIONS.length - 1) {
      if (activeSection === "basic") {
        if (!form.title) { toast({ description: "매물 제목을 입력해주세요." }); return; }
        if (!form.address) { toast({ description: "주소를 검색해주세요." }); return; }
      }
      if (activeSection === "transaction") {
        if (!form.deposit) { toast({ description: "보증금을 입력해주세요." }); return; }
      }
      setActiveSection(SECTIONS[currentIndex + 1].id);
      return;
    }

    if (!isLoggedIn) { router.push("/login"); return; }
    if (!form.title) { toast({ description: "매물 제목을 입력해주세요." }); return; }
    if (!form.address) { toast({ description: "주소를 검색해주세요." }); return; }
    if (!form.lat || !form.lng) { toast({ description: "주소 검색 후 좌표를 확인해주세요." }); return; }
    if (!form.deposit) { toast({ description: "보증금을 입력해주세요." }); return; }

    const fullAddress = form.address_detail ? `${form.address} ${form.address_detail}` : form.address;
    setRegisterForm({
      user_id: user?.user_id,
      title: form.title,
      address: fullAddress,
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

  const renderSection = () => {
    switch (activeSection) {
      case "basic":
        return (
          <div className="space-y-3">
            <div>
              <label className={labelClass}>매물 제목 *</label>
              <input name="title" value={form.title} onChange={handleChange} className={inputClass} placeholder="예) 강남역 도보 5분, 풀옵션 원룸" />
            </div>
            <div>
              <label className={labelClass}>주소 *</label>
              <div className="flex gap-2">
                <input name="address" value={form.address} onChange={handleChange} className={inputClass} placeholder="주소를 검색해주세요" readOnly onClick={openAddressSearch} />
                <button onClick={openAddressSearch} className="shrink-0 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 hover:border-stone-300">
                  검색
                </button>
              </div>
              {form.lat && form.lng && (
                <p className="mt-1 text-xs text-stone-400">위도 {parseFloat(form.lat).toFixed(6)}, 경도 {parseFloat(form.lng).toFixed(6)}</p>
              )}
              <input name="address_detail" value={form.address_detail} onChange={handleChange} className={`${inputClass} mt-2`} placeholder="상세주소 (예: 101동 1234호)" />
            </div>
          </div>
        );
      case "transaction":
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
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
            <div>
              <label className={labelClass}>관리비 (만원)</label>
              <input name="manage_cost" value={form.manage_cost} onChange={handleChange} className={inputClass} placeholder="5" type="number" />
            </div>
          </div>
        );
      case "room":
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {ROOM_TYPES.map((type) => (
                <button key={type} onClick={() => setForm((p) => ({ ...p, room_type: type }))}
                  className={`${tagBase} ${form.room_type === type ? tagActive : tagInactive}`}>
                  {type}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={labelClass}>층수</label><input name="floor" value={form.floor} onChange={handleChange} className={inputClass} placeholder="3" /></div>
              <div><label className={labelClass}>전체 층수</label><input name="all_floors" value={form.all_floors} onChange={handleChange} className={inputClass} placeholder="5" /></div>
              <div><label className={labelClass}>면적 (m²)</label><input name="area_m2" value={form.area_m2} onChange={handleChange} className={inputClass} placeholder="33" type="number" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
        );
      case "options":
        return (
          <div className="space-y-5">
            <div>
              <p className="mb-3 text-xs font-semibold text-stone-500">옵션</p>
              <div className="flex flex-wrap gap-2">
                {OPTIONS.map((opt) => (
                  <button key={opt.key}
                    onClick={() => setSelectedOptions((p) => ({ ...p, [opt.key]: !p[opt.key] }))}
                    className={`${tagBase} ${selectedOptions[opt.key] ? tagActive : tagInactive}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold text-stone-500">주변 환경</p>
              <div className="flex flex-wrap gap-2">
                {ENVIRONMENTS.map((env) => (
                  <div key={env.key} className="relative">
                    <button
                      onClick={() => setSelectedEnv((p) => ({ ...p, [env.key]: !p[env.key] }))}
                      onMouseEnter={() => setTooltip(env.key)}
                      onMouseLeave={() => setTooltip(null)}
                      className={`${tagBase} ${selectedEnv[env.key] ? tagActive : tagInactive}`}>
                      {env.label}
                    </button>
                    {tooltip === env.key && (
                      <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-800 px-3 py-1.5 text-[11px] text-white shadow-lg z-10">
                        {env.tooltip}
                        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-stone-800" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case "description":
        return (
          <div className="h-full">
            <label className={labelClass}>상세 설명</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              className={`${inputClass} h-48 resize-none`}
              placeholder="매물에 대한 상세한 설명을 입력해주세요." />
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,244,238,0.94)_100%)]">
      <header className="border-b border-stone-200/80 bg-white/70 backdrop-blur-xl flex-shrink-0">
        <div className="flex h-16 items-center px-6">
          <button onClick={() => router.back()} className="text-sm font-semibold text-stone-500 hover:text-stone-800">
            ← 돌아가기
          </button>
          <p className="flex-1 text-center text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400">매물 등록</p>
          <div className="w-20" />
        </div>
      </header>

      <div className="flex flex-1 gap-6 overflow-hidden p-6">

        {/* 좌측 네비게이션 */}
        <aside className="w-44 flex-shrink-0">
          <nav className="h-full rounded-[20px] border border-stone-200/80 bg-white/80 p-3 flex flex-col gap-1">
            {SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`cursor-pointer flex w-full items-center rounded-xl px-4 py-3 text-sm font-semibold tracking-tight transition-all duration-200 ${
                  activeSection === id
                    ? "bg-[#A8896C] text-white"
                    : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* 우측 콘텐츠 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="h-full rounded-[20px] border border-stone-200/80 bg-white/80 p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)] flex flex-col">
            <p className="mb-5 flex-shrink-0 text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400">
              {SECTIONS.find((s) => s.id === activeSection)?.label}
            </p>

            <div className="flex-1 overflow-y-auto">
              {renderSection()}
            </div>

            <div className="mt-5 flex-shrink-0 pt-4 border-t border-stone-200/80 flex justify-between">
              {currentIndex > 0 ? (
                <button
                  onClick={() => setActiveSection(SECTIONS[currentIndex - 1].id)}
                  className={`${btnBase} border-stone-200 bg-white text-stone-500 hover:border-stone-400`}
                >
                  ← 이전
                </button>
              ) : <div />}
              <button
                onClick={handleNext}
                className={`${btnBase} bg-stone-800 border-stone-800 text-white hover:opacity-90`}
              >
                {currentIndex === SECTIONS.length - 1 ? "사진 등록 →" : "다음 →"}
              </button>
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}