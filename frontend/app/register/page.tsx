"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useRegisterStore } from "@/store/registerStore";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { useState } from "react";

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

const inputBase = "w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none transition-colors cursor-text";
const inputNormal = `${inputBase} border-stone-200 bg-stone-50 focus:border-stone-400`;
const inputError = `${inputBase} border-red-400 bg-red-50 focus:border-red-400`;
const labelClass = "mb-1 block text-xs font-semibold text-stone-500";
const tagBase = "rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-150 cursor-pointer";
const tagActive = "border-[#A8896C] bg-[#A8896C] text-white";
const tagInactive = "border-stone-200 bg-white text-stone-500 hover:border-stone-400";
const nextBtn = "cursor-pointer rounded-full bg-stone-800 border border-stone-800 px-5 py-2 text-xs font-semibold text-white hover:opacity-90";

type SectionId = "basic" | "transaction" | "room" | "options" | "description";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "basic", label: "기본 정보" },
  { id: "transaction", label: "거래 정보" },
  { id: "room", label: "방 정보" },
  { id: "options", label: "옵션 · 환경" },
  { id: "description", label: "상세 설명" },
];

const ErrorMsg = ({ msg }: { msg?: string }) =>
  msg ? <p className="mt-1 flex items-center gap-1 text-[11px] text-red-500">
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#E24B4A"/><path d="M6 3.5v3M6 8h.01" stroke="#E24B4A" strokeLinecap="round"/></svg>
    {msg}
  </p> : null;

export default function RegisterPage() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuthStore();
  const setRegisterForm = useRegisterStore((state) => state.setForm);
  const [openSection, setOpenSection] = useState<SectionId>("basic");
  const [completedSections, setCompletedSections] = useState<SectionId[]>([]);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
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
    pyeong: "",
    bathroom_count: "",
    room_direction: "",
    residence_type: "",
    approve_date: "",
    movein_date: "",
    description: "",
    dist_subway: "",
    dist_bus: "",
    dist_conv: "",
    dist_mart: "",
    dist_laundry: "",
  });

  const [selectedOptions, setSelectedOptions] = useState<Record<string, boolean>>(
    Object.fromEntries(OPTIONS.map((o) => [o.key, false]))
  );
  const [selectedEnv, setSelectedEnv] = useState<Record<string, boolean>>(
    Object.fromEntries(ENVIRONMENTS.map((e) => [e.key, false]))
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const openAddressSearch = () => {
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = () => {
      new window.daum.Postcode({
        oncomplete: (data: any) => {
          const address = data.roadAddress || data.jibunAddress;
          setForm((prev) => ({ ...prev, address }));
          setErrors((prev) => { const n = { ...prev }; delete n.address; return n; });
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

  const validateSection = (sectionId: SectionId): Record<string, string> => {
    const e: Record<string, string> = {};
    if (sectionId === "basic") {
      if (!form.title.trim()) e.title = "매물 제목을 입력해주세요.";
      if (!form.address.trim()) e.address = "주소를 검색해주세요.";
    }
    if (sectionId === "transaction") {
      if (!form.deposit) e.deposit = "보증금을 입력해주세요.";
      if (form.transaction_type === "monthly" && !form.rent) e.rent = "월세를 입력해주세요.";
    }
    return e;
  };

  const handleSectionNext = (sectionId: SectionId) => {
    const e = validateSection(sectionId);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    if (!completedSections.includes(sectionId)) {
      setCompletedSections((prev) => [...prev, sectionId]);
    }
    const idx = SECTIONS.findIndex((s) => s.id === sectionId);
    if (idx < SECTIONS.length - 1) {
      setOpenSection(SECTIONS[idx + 1].id);
    }
  };

  const handleSubmit = () => {
    if (!isLoggedIn) { router.push("/login"); return; }

    const allErrors: Record<string, string> = {};
    Object.assign(allErrors, validateSection("basic"), validateSection("transaction"));
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      if (allErrors.title || allErrors.address) setOpenSection("basic");
      else setOpenSection("transaction");
      return;
    }

    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (isNaN(lat) || isNaN(lng)) {
      setErrors({ address: "주소를 다시 검색해주세요." });
      setOpenSection("basic");
      return;
    }

    const area_m2 = form.pyeong ? parseFloat(form.pyeong) * 3.3058 : null;
    const fullAddress = form.address_detail ? `${form.address} ${form.address_detail}` : form.address;

    setRegisterForm({
      user_id: user?.user_id,
      title: form.title,
      address: fullAddress,
      lat,
      lng,
      transaction_type: form.transaction_type,
      deposit: parseInt(form.deposit),
      rent: form.rent ? parseInt(form.rent) : 0,
      manage_cost: form.manage_cost ? parseInt(form.manage_cost) : null,
      room_type: form.room_type,
      floor: form.floor || null,
      all_floors: form.all_floors || null,
      area_m2,
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
      dist_subway: form.dist_subway ? parseInt(form.dist_subway) : null,
      dist_bus: form.dist_bus ? parseInt(form.dist_bus) : null,
      dist_conv: form.dist_conv ? parseInt(form.dist_conv) : null,
      dist_mart: form.dist_mart ? parseInt(form.dist_mart) : null,
      dist_laundry: form.dist_laundry ? parseInt(form.dist_laundry) : null,
    });
    router.push("/register-photo");
  };

  const renderSectionContent = (sectionId: SectionId) => {
    switch (sectionId) {
      case "basic":
        return (
          <div className="space-y-4 pt-2">
            <div>
              <label className={labelClass}>매물 제목 *</label>
              <input name="title" value={form.title} onChange={handleChange}
                className={errors.title ? inputError : inputNormal}
                placeholder="예) 강남역 도보 5분, 풀옵션 원룸" />
              <ErrorMsg msg={errors.title} />
            </div>
            <div>
              <label className={labelClass}>주소 *</label>
              <div className="flex gap-2">
                <input name="address" value={form.address} onChange={handleChange}
                  className={`${errors.address ? inputError : inputNormal} cursor-pointer`}
                  placeholder="주소를 검색해주세요" readOnly onClick={openAddressSearch} />
                <button onClick={openAddressSearch} className="shrink-0 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 hover:border-stone-300 cursor-pointer">
                  검색
                </button>
              </div>
              <ErrorMsg msg={errors.address} />
              {form.lat && form.lng && (
                <p className="mt-1 text-xs text-stone-400">위도 {parseFloat(form.lat).toFixed(6)}, 경도 {parseFloat(form.lng).toFixed(6)}</p>
              )}
              <input name="address_detail" value={form.address_detail} onChange={handleChange}
                className={`${inputNormal} mt-2`} placeholder="예) 101동 1234호 (상세주소)" />
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => handleSectionNext("basic")} className={nextBtn}>다음 →</button>
            </div>
          </div>
        );
      case "transaction":
        return (
          <div className="space-y-4 pt-2">
            <div>
              <label className={labelClass}>거래 유형</label>
              <div className="flex gap-2 mt-1">
                {["monthly", "jeonse"].map((type) => (
                  <button key={type} onClick={() => setForm((p) => ({ ...p, transaction_type: type }))}
                    className={`${tagBase} ${form.transaction_type === type ? tagActive : tagInactive}`}>
                    {type === "monthly" ? "월세" : "전세"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>보증금 (만원) *</label>
                <input name="deposit" value={form.deposit} onChange={handleChange}
                  className={errors.deposit ? inputError : inputNormal}
                  placeholder="예) 1000" type="number" />
                <ErrorMsg msg={errors.deposit} />
              </div>
              {form.transaction_type === "monthly" && (
                <div>
                  <label className={labelClass}>월세 (만원) *</label>
                  <input name="rent" value={form.rent} onChange={handleChange}
                    className={errors.rent ? inputError : inputNormal}
                    placeholder="예) 50" type="number" />
                  <ErrorMsg msg={errors.rent} />
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>관리비 (만원)</label>
              <input name="manage_cost" value={form.manage_cost} onChange={handleChange}
                className={inputNormal} placeholder="예) 5 (없으면 0)" type="number" />
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => handleSectionNext("transaction")} className={nextBtn}>다음 →</button>
            </div>
          </div>
        );
      case "room":
        return (
          <div className="space-y-4 pt-2">
            <div>
              <label className={labelClass}>방 유형</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ROOM_TYPES.map((type) => (
                  <button key={type} onClick={() => setForm((p) => ({ ...p, room_type: type }))}
                    className={`${tagBase} ${form.room_type === type ? tagActive : tagInactive}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>층수</label>
                <input name="floor" value={form.floor} onChange={handleChange} className={inputNormal} placeholder="예) 3" />
              </div>
              <div>
                <label className={labelClass}>전체 층수</label>
                <input name="all_floors" value={form.all_floors} onChange={handleChange} className={inputNormal} placeholder="예) 10" />
              </div>
              <div>
                <label className={labelClass}>평수</label>
                <input name="pyeong" value={form.pyeong} onChange={handleChange} className={inputNormal} placeholder="예) 10" type="number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>욕실 수</label>
                <input name="bathroom_count" value={form.bathroom_count} onChange={handleChange} className={inputNormal} placeholder="예) 1" type="number" />
              </div>
              <div>
                <label className={labelClass}>방향</label>
                <select name="room_direction" value={form.room_direction} onChange={handleChange} className={`${inputNormal} cursor-pointer`}>
                  <option value="">선택</option>
                  {DIRECTIONS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>주거 형태</label>
                <select name="residence_type" value={form.residence_type} onChange={handleChange} className={`${inputNormal} cursor-pointer`}>
                  <option value="">선택</option>
                  {RESIDENCE_TYPES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>사용 승인일</label>
                <input name="approve_date" value={form.approve_date} onChange={handleChange} className={`${inputNormal} cursor-pointer`} type="date" />
              </div>
            </div>
            <div>
              <label className={labelClass}>입주 가능일</label>
              <input name="movein_date" value={form.movein_date} onChange={handleChange} className={`${inputNormal} cursor-pointer`} type="date" />
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => handleSectionNext("room")} className={nextBtn}>다음 →</button>
            </div>
          </div>
        );
      case "options":
        return (
          <div className="space-y-5 pt-2">
            <div>
              <p className="mb-3 text-xs font-semibold text-stone-500">옵션</p>
              <div className="flex flex-wrap gap-2">
                {OPTIONS.map((opt) => (
                  <button key={opt.key}
                    onClick={() => setSelectedOptions((p) => ({ ...p, [opt.key]: !p[opt.key] }))}
                    className={`inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-semibold tracking-tight transition-all duration-200 cursor-pointer ${
                      selectedOptions[opt.key]
                        ? "border-[#A8896C] bg-[#A8896C] text-white"
                        : "border-stone-200 bg-gradient-to-b from-white to-stone-50 text-stone-700 hover:-translate-y-[1px]"
                    }`}>
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
                      className={`inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-semibold tracking-tight transition-all duration-200 cursor-pointer ${
                        selectedEnv[env.key]
                          ? "border-[#A8896C] bg-[#A8896C] text-white"
                          : "border-stone-200 bg-gradient-to-b from-white to-stone-50 text-stone-700 hover:-translate-y-[1px]"
                      }`}>
                      {env.label}
                    </button>
                    {tooltip === env.key && (
                      <div className="absolute top-full left-1/2 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-800 px-3 py-1.5 text-[11px] text-white shadow-lg z-10">
                        {env.tooltip}
                        <div className="absolute left-1/2 bottom-full -translate-x-1/2 border-4 border-transparent border-b-stone-800" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold text-stone-500">주변 시설 거리</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>지하철역 (m)</label>
                  <input name="dist_subway" value={form.dist_subway} onChange={handleChange} className={inputNormal} placeholder="예) 300" type="number" />
                </div>
                <div>
                  <label className={labelClass}>버스정류장 (m)</label>
                  <input name="dist_bus" value={form.dist_bus} onChange={handleChange} className={inputNormal} placeholder="예) 100" type="number" />
                </div>
                <div>
                  <label className={labelClass}>편의점 (m)</label>
                  <input name="dist_conv" value={form.dist_conv} onChange={handleChange} className={inputNormal} placeholder="예) 50" type="number" />
                </div>
                <div>
                  <label className={labelClass}>마트 (m)</label>
                  <input name="dist_mart" value={form.dist_mart} onChange={handleChange} className={inputNormal} placeholder="예) 500" type="number" />
                </div>
                <div>
                  <label className={labelClass}>세탁소 (m)</label>
                  <input name="dist_laundry" value={form.dist_laundry} onChange={handleChange} className={inputNormal} placeholder="예) 200" type="number" />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => handleSectionNext("options")} className={nextBtn}>다음 →</button>
            </div>
          </div>
        );
      case "description":
        return (
          <div className="space-y-4 pt-2">
            <div>
              <label className={labelClass}>상세 설명</label>
              <textarea name="description" value={form.description} onChange={handleChange}
                className={`${inputNormal} h-36 resize-none`}
                placeholder="예) 채광이 좋고 교통이 편리한 원룸입니다. 풀옵션으로 입주 즉시 가능합니다." />
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={handleSubmit} className={nextBtn}>
                사진 등록 →
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,244,238,0.94)_100%)]">
      <header className="border-b border-stone-200/80 bg-white/70 backdrop-blur-xl flex-shrink-0">
        <div className="flex h-16 items-center px-6">
          <button onClick={() => router.back()} className="text-sm font-semibold text-stone-500 hover:text-stone-800 cursor-pointer">
            ← 돌아가기
          </button>
          <p className="flex-1 text-center text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400">매물 등록</p>
          <div className="w-20" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8 space-y-3">
        {SECTIONS.map((section) => {
          const isOpen = openSection === section.id;
          const isCompleted = completedSections.includes(section.id);

          return (
            <div key={section.id}
              className={`rounded-[20px] border bg-white/80 shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition-all duration-200 ${
                isOpen ? "border-[#A8896C]/40" : "border-stone-200/80"
              }`}>
              <button
                onClick={() => setOpenSection(section.id)}
                className="flex w-full items-center justify-between px-6 py-4 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {isCompleted && !isOpen ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                  ) : (
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
                      isOpen ? "border-[#A8896C] text-[#A8896C]" : "border-stone-200 text-stone-400"
                    }`}>
                      {SECTIONS.findIndex((s) => s.id === section.id) + 1}
                    </div>
                  )}
                  <span className={`text-sm font-semibold ${isOpen ? "text-stone-900" : isCompleted ? "text-green-500" : "text-stone-500"}`}>
                    {section.label}
                  </span>
                  {isCompleted && !isOpen && (
                    <span className="text-xs text-green-500">완료</span>
                  )}
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-stone-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-stone-400" />
                )}
              </button>

              {isOpen && (
                <div className="px-6 pb-5 border-t border-stone-100">
                  {renderSectionContent(section.id)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
