"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";

export interface Filters {
  transactionType: string;
  deposit: number | "all";
  monthlyRent: number | "all";
  structure: string[];
  size: number | "all";
  sizeUnit: "m2" | "pyeong";
  floor: string;
  options: string[];
}

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  roomType: "oneroom" | "tworoom";
}

const ONE_ROOM_MAX_DEPOSIT = 20000;
const TWO_ROOM_MAX_DEPOSIT = 60000;
const MAX_MONTHLY_RENT = 200;
const ONE_ROOM_MAX_SIZE_M2 = 66;
const TWO_ROOM_MAX_SIZE_M2 = 99;
const ONE_ROOM_MAX_SIZE_PYEONG = 20;
const TWO_ROOM_MAX_SIZE_PYEONG = 30;
const SLIDER_DEBOUNCE_MS = 300;

function getMaxDeposit(roomType: "oneroom" | "tworoom") {
  return roomType === "tworoom" ? TWO_ROOM_MAX_DEPOSIT : ONE_ROOM_MAX_DEPOSIT;
}

function getDepositMarks(roomType: "oneroom" | "tworoom") {
  return roomType === "tworoom"
    ? [0, 10000, 20000, 40000, 60000]
    : [0, 5000, 10000, 15000, 20000];
}

function getMaxSize(
  roomType: "oneroom" | "tworoom",
  sizeUnit: "m2" | "pyeong",
) {
  if (sizeUnit === "m2") {
    return roomType === "tworoom" ? TWO_ROOM_MAX_SIZE_M2 : ONE_ROOM_MAX_SIZE_M2;
  }

  return roomType === "tworoom"
    ? TWO_ROOM_MAX_SIZE_PYEONG
    : ONE_ROOM_MAX_SIZE_PYEONG;
}

function getSizeMarks(
  roomType: "oneroom" | "tworoom",
  sizeUnit: "m2" | "pyeong",
) {
  if (sizeUnit === "m2") {
    return roomType === "tworoom" ? [0, 30, 60, 90, 99] : [0, 15, 30, 45, 66];
  }

  return roomType === "tworoom" ? [0, 10, 20, 25, 30] : [0, 5, 10, 15, 20];
}

function clampSize(value: number, max: number) {
  if (!Number.isFinite(value)) return 0;

  return Math.min(Math.max(value, 0), max);
}

function clampDeposit(value: number, max: number) {
  if (!Number.isFinite(value)) return 0;

  return Math.min(Math.max(Math.round(value), 0), max);
}

function parseDepositInput(value: string, max: number) {
  const numericValue = value.replace(/[^\d]/g, "");
  if (!numericValue) return 0;

  return clampDeposit(Number(numericValue), max);
}

export function FilterBar({
  filters,
  onFiltersChange,
  searchQuery,
  onSearchChange,
  roomType,
}: FilterBarProps) {
  const [priceOpen, setPriceOpen] = useState(false);
  const [structureOpen, setStructureOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [floorOpen, setFloorOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);

  const [depositDraft, setDepositDraft] = useState<number>(
    filters.deposit === "all" ? 0 : filters.deposit,
  );
  const [monthlyRentDraft, setMonthlyRentDraft] = useState<number>(
    filters.monthlyRent === "all" ? 0 : filters.monthlyRent,
  );
  const [sizeDraft, setSizeDraft] = useState<number>(
    filters.size === "all" ? 0 : Number(filters.size),
  );

  const formatDeposit = (value: number) => {
    if (value >= 10000) {
      const eok = Math.floor(value / 10000);
      const rest = value % 10000;

      return rest === 0 ? `${eok}억` : `${eok}억 ${rest}만`;
    }

    return `${value}만`;
  };

  const depositMax = getMaxDeposit(roomType);
  const depositMarks = getDepositMarks(roomType);
  const canFilterStructure = roomType === "oneroom";

  useEffect(() => {
    setDepositDraft(filters.deposit === "all" ? 0 : filters.deposit);
  }, [filters.deposit]);

  useEffect(() => {
    setMonthlyRentDraft(
      filters.monthlyRent === "all" ? 0 : filters.monthlyRent,
    );
  }, [filters.monthlyRent]);

  useEffect(() => {
    setSizeDraft(filters.size === "all" ? 0 : Number(filters.size));
  }, [filters.size, filters.sizeUnit]);

  useEffect(() => {
    const currentDeposit = filters.deposit === "all" ? 0 : filters.deposit;
    if (depositDraft === currentDeposit) return;

    const timer = setTimeout(() => {
      onFiltersChange({
        ...filters,
        deposit: depositDraft === 0 ? "all" : depositDraft,
      });
    }, SLIDER_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [depositDraft]);

  useEffect(() => {
    const currentMonthlyRent =
      filters.monthlyRent === "all" ? 0 : filters.monthlyRent;
    if (monthlyRentDraft === currentMonthlyRent) return;

    const timer = setTimeout(() => {
      onFiltersChange({
        ...filters,
        monthlyRent: monthlyRentDraft === 0 ? "all" : monthlyRentDraft,
      });
    }, SLIDER_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [monthlyRentDraft]);

  useEffect(() => {
    const currentSize = filters.size === "all" ? 0 : Number(filters.size);
    if (sizeDraft === currentSize) return;

    const timer = setTimeout(() => {
      onFiltersChange({
        ...filters,
        size: sizeDraft === 0 ? "all" : sizeDraft,
      });
    }, SLIDER_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [sizeDraft, filters.sizeUnit]);

  const sizeMax = getMaxSize(roomType, filters.sizeUnit);
  const sizeMarks = getSizeMarks(roomType, filters.sizeUnit);
  const sizeStep = filters.sizeUnit === "m2" ? 1 : 0.5;

  const sizeLabel =
    filters.size === "all"
      ? "방 크기"
      : filters.sizeUnit === "m2"
        ? `~ ${filters.size}m²`
        : `~ ${filters.size}평`;

  const optionItems = [
    { label: "에어컨", value: "aircon" },
    { label: "책상", value: "desk" },
    { label: "냉장고", value: "fridge" },
    { label: "책장", value: "bookshelf" },
    { label: "세탁기", value: "washer" },
    { label: "침대", value: "bed" },
    { label: "가스레인지", value: "gas_stove" },
    { label: "인덕션", value: "induction" },
    { label: "신발장", value: "shoe_cabinet" },
    { label: "전자레인지", value: "microwave" },
    { label: "싱크대", value: "sink" },
    { label: "옷장", value: "closet" },
  ];

  const structureItems = [
    { label: "오픈형", value: "open" },
    { label: "분리형", value: "separated" },
    { label: "복층", value: "duplex" },
  ];

  const floorItems = [
    { label: "층수", value: "all" },
    { label: "반지하", value: "semi-basement" },
    { label: "1층", value: "1" },
    { label: "2층", value: "2" },
    { label: "3층", value: "3" },
    { label: "4층 이상", value: "4plus" },
  ];

  const structureLabel =
    !canFilterStructure || filters.structure.length === 0
      ? "방 구조"
      : structureItems
          .filter((item) => filters.structure.includes(item.value))
          .map((item) => item.label)
          .join(", ");

  const optionsLabel =
    filters.options.length === 0 ? "옵션" : `옵션 ${filters.options.length}개`;

  const updateFilter = (
    key: keyof Filters,
    value: string | number | string[],
  ) => {
    const nextFilters = { ...filters, [key]: value } as Filters;

    if (key === "transactionType") {
      if (value === "jeonse") {
        nextFilters.monthlyRent = "all";
        setMonthlyRentDraft(0);
      }
    }

    onFiltersChange(nextFilters);
  };

  const toggleOption = (value: string) => {
    const nextOptions = filters.options.includes(value)
      ? filters.options.filter((option) => option !== value)
      : [...filters.options, value];

    onFiltersChange({ ...filters, options: nextOptions });
  };

  const toggleStructure = (value: string) => {
    const nextStructure = filters.structure.includes(value)
      ? filters.structure.filter((structure) => structure !== value)
      : [...filters.structure, value];

    onFiltersChange({ ...filters, structure: nextStructure });
  };

  const resetOptions = () => {
    onFiltersChange({ ...filters, options: [] });
  };

  const resetStructure = () => {
    onFiltersChange({ ...filters, structure: [] });
  };

  const priceLabel = (() => {
    if (filters.transactionType === "jeonse") {
      return filters.deposit === "all"
        ? "보증금"
        : `전세 ~ ${formatDeposit(filters.deposit)}`;
    }

    if (filters.transactionType === "monthly") {
      const depositText =
        filters.deposit === "all"
          ? "보증금"
          : `보증금 ~ ${formatDeposit(filters.deposit)}`;
      const rentText =
        filters.monthlyRent === "all"
          ? "월세"
          : `월세 ~ ${filters.monthlyRent}만원`;
      return `${depositText} / ${rentText}`;
    }

    const depositText =
      filters.deposit === "all"
        ? "보증금"
        : `${formatDeposit(filters.deposit)}`;
    const rentText =
      filters.monthlyRent === "all" ? "월세" : `${filters.monthlyRent}만원`;
    return `${depositText} / ${rentText}`;
  })();

  const isTransactionSelected = filters.transactionType !== "all";
  const isPriceSelected = filters.deposit !== "all" || filters.monthlyRent !== "all";
  const isStructureSelected = filters.structure.length > 0;
  const isSizeSelected = filters.size !== "all";
  const isFloorSelected = filters.floor !== "all";
  const isOptionsSelected = filters.options.length > 0;

  const selectedStyle = "border-warm-brown bg-warm-brown !text-white hover:opacity-90 rounded-full";
  const defaultStyle = "border-stone-200/80 bg-white/90 text-stone-800 shadow-[0_6px_18px_rgba(15,23,42,0.04)] hover:border-stone-300 hover:bg-white rounded-full";

  const selectTriggerClass = (isSelected: boolean) =>
    `w-[160px] md:w-full py-5 rounded-full border text-sm font-medium tracking-tight transition-all duration-200 ${isSelected ? selectedStyle : defaultStyle}`;

  const popoverTriggerClass = (isSelected: boolean) =>
    `cursor-pointer w-[160px] md:w-full flex items-center justify-between rounded-full border px-4 py-2.5 text-sm font-medium tracking-tight transition-all duration-200 ${isSelected ? selectedStyle : defaultStyle}`;

  const popoverContentClass =
    "border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,246,241,0.96)_100%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.12)]";

  const dropdownContentClass =
    "border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,246,241,0.96)_100%)] p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)] rounded-2xl";

  const selectItemClass =
    "cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium tracking-tight text-stone-700 outline-none transition-colors focus:bg-stone-100 focus:text-stone-900 data-[highlighted]:bg-stone-100 data-[highlighted]:text-stone-900";

  return (
    <div className="border-b border-stone-200/80 bg-white/70 px-4 py-4 backdrop-blur-md md:px-6">
      <div className="relative mb-3">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="찾고자 하는 지역을 검색해 주세요."
          className="w-full pl-10 pr-4 py-2.5 bg-stone-100 rounded-full border border-stone-200 text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:border-warm-brown text-sm"
        />
      </div>
      <div
        className={`flex gap-2 overflow-x-auto pb-2 md:grid md:gap-4 md:pb-0 ${
          canFilterStructure ? "md:grid-cols-6" : "md:grid-cols-5"
        } scrollbar-hide`}
      >
        <Select
          value={filters.transactionType}
          onValueChange={(v) => updateFilter("transactionType", v)}
          onOpenChange={(open) => setTransactionOpen(open)}
        >
          <SelectTrigger className={selectTriggerClass(isTransactionSelected || transactionOpen)}>
            <SelectValue placeholder="거래 방식" />
          </SelectTrigger>
          <SelectContent
            className={`w-[160px] ${dropdownContentClass}`}
          >
            <SelectItem value="all" className={selectItemClass}>
              전/월세
            </SelectItem>
            <SelectItem value="monthly" className={selectItemClass}>
              월세
            </SelectItem>
            <SelectItem value="jeonse" className={selectItemClass}>
              전세
            </SelectItem>
          </SelectContent>
        </Select>

        <Popover open={priceOpen} onOpenChange={setPriceOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={popoverTriggerClass(isPriceSelected || priceOpen)}>
              <span className="truncate">{priceLabel}</span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className={`w-[300px] md:w-[360px] lg:w-[420px] ${popoverContentClass}`}
          >
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-dark">
                    보증금
                  </span>
                  <div className="relative w-28">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={depositDraft === 0 ? "" : String(depositDraft)}
                      onChange={(event) =>
                        setDepositDraft(
                          parseDepositInput(event.target.value, depositMax),
                        )
                      }
                      placeholder="전체"
                      aria-label="보증금 직접 입력"
                      className="h-8 pr-9 text-right text-sm text-neutral-muted"
                    />
                    {depositDraft !== 0 && (
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-muted">
                        만원
                      </span>
                    )}
                  </div>
                </div>

                <Slider
                  value={[depositDraft]}
                  min={0}
                  max={depositMax}
                  step={100}
                  onValueChange={(value) =>
                    setDepositDraft(clampDeposit(value[0], depositMax))
                  }
                />

                <div className="flex justify-between text-xs text-neutral-muted">
                  {depositMarks.map((mark) => (
                    <span key={mark}>
                      {mark === 0 ? "전체" : formatDeposit(mark)}
                    </span>
                  ))}
                </div>
              </div>

              {filters.transactionType !== "jeonse" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-dark">
                      월세
                    </span>
                    <span className="text-sm text-neutral-muted">
                      {monthlyRentDraft === 0
                        ? "전체"
                        : `${monthlyRentDraft}만원`}
                    </span>
                  </div>

                  <Slider
                    value={[monthlyRentDraft]}
                    min={0}
                    max={MAX_MONTHLY_RENT}
                    step={5}
                    onValueChange={(value) => setMonthlyRentDraft(value[0])}
                  />

                  <div className="flex justify-between text-xs text-neutral-muted">
                    <span>전체</span>
                    <span>50</span>
                    <span>100</span>
                    <span>150</span>
                    <span>200+</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDepositDraft(0);
                    setMonthlyRentDraft(0);
                  }}
                  className="cursor-pointer rounded-md border border-border-warm px-3 py-1.5 text-sm text-neutral-dark"
                >
                  초기화
                </button>
                <button
                  type="button"
                  onClick={() => setPriceOpen(false)}
                  className="cursor-pointer rounded-md bg-warm-brown px-3 py-1.5 text-sm text-white"
                >
                  적용
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {canFilterStructure && (
          <Popover open={structureOpen} onOpenChange={setStructureOpen}>
            <PopoverTrigger asChild>
              <button type="button" className={popoverTriggerClass(isStructureSelected || structureOpen)}>
                <span className="truncate">{structureLabel}</span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              className={`w-[240px] md:w-[320px] lg:w-[380px] ${popoverContentClass}`}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-neutral-dark">
                    방 구조
                  </span>
                  <span className="text-sm text-neutral-muted">
                    중복선택 가능
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  {structureItems.map((item) => {
                    const isSelected = filters.structure.includes(item.value);

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => toggleStructure(item.value)}
                        className={`cursor-pointer rounded-full border px-5 py-3 text-sm font-medium transition-colors ${
                          isSelected
                            ? "border-warm-brown bg-warm-brown text-white"
                            : "border-border-warm bg-white text-neutral-dark hover:bg-neutral-50"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetStructure}
                    className="cursor-pointer rounded-md border border-border-warm px-3 py-1.5 text-sm text-neutral-dark"
                  >
                    초기화
                  </button>
                  <button
                    type="button"
                    onClick={() => setStructureOpen(false)}
                    className="cursor-pointer rounded-md bg-warm-brown px-3 py-1.5 text-sm text-white"
                  >
                    적용
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Popover open={sizeOpen} onOpenChange={setSizeOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={popoverTriggerClass(isSizeSelected || sizeOpen)}>
              <span className="truncate">{sizeLabel}</span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className={`w-[300px] md:w-[360px] lg:w-[420px] ${popoverContentClass}`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-dark">
                  최대 면적
                </span>
                <span className="text-sm text-neutral-muted">
                  {sizeDraft === 0
                    ? "전체"
                    : filters.sizeUnit === "m2"
                      ? `${sizeDraft}m²`
                      : `${sizeDraft}평`}
                </span>
              </div>

              <div className="inline-flex rounded-md border border-border-warm overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    const nextSize =
                      sizeDraft === 0
                        ? 0
                        : clampSize(
                            Number((sizeDraft / 3.3058).toFixed(1)),
                            getMaxSize(roomType, "pyeong"),
                          );

                    onFiltersChange({
                      ...filters,
                      sizeUnit: "pyeong",
                      size: nextSize === 0 ? "all" : nextSize,
                    });
                    setSizeDraft(nextSize);
                  }}
                  className={`cursor-pointer px-3 py-1.5 text-sm ${
                    filters.sizeUnit === "m2"
                      ? "bg-white text-neutral-dark"
                      : "bg-warm-brown text-white"
                  }`}
                >
                  평
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextSize =
                      sizeDraft === 0
                        ? 0
                        : clampSize(
                            Math.round(sizeDraft * 3.3058),
                            getMaxSize(roomType, "m2"),
                          );

                    onFiltersChange({
                      ...filters,
                      sizeUnit: "m2",
                      size: nextSize === 0 ? "all" : nextSize,
                    });
                    setSizeDraft(nextSize);
                  }}
                  className={`cursor-pointer px-3 py-1.5 text-sm ${
                    filters.sizeUnit === "pyeong"
                      ? "bg-white text-neutral-dark"
                      : "bg-warm-brown text-white"
                  }`}
                >
                  m²
                </button>
              </div>

              <Slider
                value={[sizeDraft]}
                min={0}
                max={sizeMax}
                step={sizeStep}
                onValueChange={(value) =>
                  setSizeDraft(clampSize(value[0], sizeMax))
                }
              />

              <div className="flex justify-between text-xs text-neutral-muted">
                {sizeMarks.map((mark) => (
                  <span key={mark}>
                    {mark === 0
                      ? "전체"
                      : `${mark}${mark === sizeMax ? "+" : ""}`}
                  </span>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSizeDraft(0)}
                  className="cursor-pointer rounded-md border border-border-warm px-3 py-1.5 text-sm text-neutral-dark"
                >
                  초기화
                </button>
                <button
                  type="button"
                  onClick={() => setSizeOpen(false)}
                  className="cursor-pointer rounded-md bg-warm-brown px-3 py-1.5 text-sm text-white"
                >
                  적용
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Select
          value={filters.floor}
          onValueChange={(v) => updateFilter("floor", v)}
          onOpenChange={(open) => setFloorOpen(open)}
        >
          <SelectTrigger className={selectTriggerClass(isFloorSelected || floorOpen)}>
            <SelectValue placeholder="층수" />
          </SelectTrigger>
          <SelectContent
            className={`w-[160px] ${dropdownContentClass}`}
          >
            {floorItems.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                className={selectItemClass}
              >
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={popoverTriggerClass(isOptionsSelected || optionsOpen)}>
              <span className="truncate">{optionsLabel}</span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className={`w-[240px] md:w-[320px] lg:w-[380px] ${popoverContentClass}`}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-neutral-dark">
                  매물 옵션
                </span>
                <span className="text-sm text-neutral-muted">
                  중복선택 가능
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                {optionItems.map((item) => {
                  const isSelected = filters.options.includes(item.value);

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => toggleOption(item.value)}
                      className={`cursor-pointer rounded-full border px-5 py-3 text-sm font-medium transition-colors ${
                        isSelected
                          ? "border-warm-brown bg-warm-brown text-white"
                          : "border-border-warm bg-white text-neutral-dark hover:bg-neutral-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetOptions}
                  className="cursor-pointer rounded-md border border-border-warm px-3 py-1.5 text-sm text-neutral-dark"
                >
                  초기화
                </button>
                <button
                  type="button"
                  onClick={() => setOptionsOpen(false)}
                  className="cursor-pointer rounded-md bg-warm-brown px-3 py-1.5 text-sm text-white"
                >
                  적용
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>


    </div>
  );
}
