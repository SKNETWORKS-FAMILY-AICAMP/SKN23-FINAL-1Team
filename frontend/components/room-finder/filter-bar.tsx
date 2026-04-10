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
import { ChevronDown } from "lucide-react";

export interface Filters {
  transactionType: string;
  deposit: number | "all";
  monthlyRent: number | "all";
  structure: string;
  size: number | "all";
  sizeUnit: "m2" | "pyeong";
  options: string[];
}

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const MAX_DEPOSIT = 50000; // 만원 단위: 5억
const MAX_MONTHLY_RENT = 200; // 만원 단위
const MAX_SIZE_M2 = 66;
const MAX_SIZE_PYEONG = 20;
const SLIDER_DEBOUNCE_MS = 300;

export function FilterBar({
  filters,
  onFiltersChange,
  searchQuery,
  onSearchChange,
}: FilterBarProps) {
  const [priceOpen, setPriceOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
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

  const sizeMax = filters.sizeUnit === "m2" ? MAX_SIZE_M2 : MAX_SIZE_PYEONG;
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

  const resetOptions = () => {
    onFiltersChange({ ...filters, options: [] });
  };

  const priceLabel = (() => {
    if (filters.transactionType === "jeonse") {
      return filters.deposit === "all"
        ? "보증금"
        : `전세 ~ ${filters.deposit}만원`;
    }

    if (filters.transactionType === "monthly") {
      const depositText =
        filters.deposit === "all"
          ? "보증금 전체"
          : `보증금 ~ ${filters.deposit}만원`;
      const rentText =
        filters.monthlyRent === "all"
          ? "월세 전체"
          : `월세 ~ ${filters.monthlyRent}만원`;
      return `${depositText} / ${rentText}`;
    }

    const depositText =
      filters.deposit === "all"
        ? "보증금 전체"
        : `보증금 ~ ${filters.deposit}만원`;
    const rentText =
      filters.monthlyRent === "all"
        ? "월세 전체"
        : `월세 ~ ${filters.monthlyRent}만원`;
    return `${depositText} / ${rentText}`;
  })();

  return (
    <div className="bg-ivory border-b border-border-warm px-4 md:px-6 py-3 md:py-4 flex flex-col gap-3 md:gap-4">
      <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-0 md:grid md:grid-cols-6 scrollbar-hide">
        <Select
          value={filters.transactionType}
          onValueChange={(v) => updateFilter("transactionType", v)}
        >
          <SelectTrigger className="min-w-[140px] md:min-w-[160px] bg-ivory border-border-warm text-neutral-dark text-sm md:text-base">
            <SelectValue placeholder="거래 방식" />
          </SelectTrigger>
          <SelectContent className="w-[200px] md:w-[180px] lg:w-[220px] bg-ivory border-border-warm">
            <SelectItem value="all">전/월세</SelectItem>
            <SelectItem value="monthly">월세</SelectItem>
            <SelectItem value="jeonse">전세</SelectItem>
          </SelectContent>
        </Select>

        <Popover open={priceOpen} onOpenChange={setPriceOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-[200px] md:w-[220px] lg:w-[240px] flex items-center justify-between rounded-md border border-border-warm bg-ivory px-3 py-2 text-sm md:text-base text-neutral-dark"
            >
              <span className="truncate">{priceLabel}</span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className="w-[300px] md:w-[360px] lg:w-[420px] border-border-warm bg-ivory p-4"
          >
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-dark">
                    보증금
                  </span>
                  <span className="text-sm text-neutral-muted">
                    {depositDraft === 0 ? "전체" : `${depositDraft}만원`}
                  </span>
                </div>

                <Slider
                  value={[depositDraft]}
                  min={0}
                  max={MAX_DEPOSIT}
                  step={500}
                  onValueChange={(value) => setDepositDraft(value[0])}
                />

                <div className="flex justify-between text-xs text-neutral-muted">
                  <span>전체</span>
                  <span>1억</span>
                  <span>2억</span>
                  <span>3억</span>
                  <span>5억+</span>
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
                  className="rounded-md border border-border-warm px-3 py-1.5 text-sm text-neutral-dark"
                >
                  초기화
                </button>
                <button
                  type="button"
                  onClick={() => setPriceOpen(false)}
                  className="rounded-md bg-warm-brown px-3 py-1.5 text-sm text-white"
                >
                  적용
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Select
          value={filters.structure}
          onValueChange={(v) => updateFilter("structure", v)}
        >
          <SelectTrigger className="min-w-[140px] md:min-w-[160px] bg-ivory border-border-warm text-neutral-dark text-sm md:text-base">
            <SelectValue placeholder="방 구조" />
          </SelectTrigger>
          <SelectContent className="w-[140px] md:w-[180px] lg:w-[220px] bg-ivory border-border-warm">
            <SelectItem value="all">구조</SelectItem>
            <SelectItem value="open">오픈형</SelectItem>
            <SelectItem value="separated">분리형</SelectItem>
            <SelectItem value="duplex">복층</SelectItem>
          </SelectContent>
        </Select>

        <Popover open={sizeOpen} onOpenChange={setSizeOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-[140px] md:w-[160px] lg:w-[160px] flex items-center justify-between rounded-md border border-border-warm bg-ivory px-3 py-2 text-sm md:text-base text-neutral-dark"
            >
              <span className="truncate">{sizeLabel}</span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className="w-[260px] md:w-[320px] lg:w-[360px] border-border-warm bg-ivory p-4"
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
                        : Number((sizeDraft / 3.3058).toFixed(1));

                    onFiltersChange({
                      ...filters,
                      sizeUnit: "pyeong",
                      size: nextSize === 0 ? "all" : nextSize,
                    });
                    setSizeDraft(nextSize);
                  }}
                  className={`px-3 py-1.5 text-sm ${
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
                      sizeDraft === 0 ? 0 : Math.round(sizeDraft * 3.3058);

                    onFiltersChange({
                      ...filters,
                      sizeUnit: "m2",
                      size: nextSize === 0 ? "all" : nextSize,
                    });
                    setSizeDraft(nextSize);
                  }}
                  className={`px-3 py-1.5 text-sm ${
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
                onValueChange={(value) => setSizeDraft(value[0])}
              />

              <div className="flex justify-between text-xs text-neutral-muted">
                {filters.sizeUnit === "m2" ? (
                  <>
                    <span>전체</span>
                    <span>15</span>
                    <span>30</span>
                    <span>45</span>
                    <span>66+</span>
                  </>
                ) : (
                  <>
                    <span>전체</span>
                    <span>5</span>
                    <span>10</span>
                    <span>15</span>
                    <span>20+</span>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSizeDraft(0)}
                  className="rounded-md border border-border-warm px-3 py-1.5 text-sm text-neutral-dark"
                >
                  초기화
                </button>
                <button
                  type="button"
                  onClick={() => setSizeOpen(false)}
                  className="rounded-md bg-warm-brown px-3 py-1.5 text-sm text-white"
                >
                  적용
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-[140px] md:w-[160px] lg:w-[160px] flex items-center justify-between rounded-md border border-border-warm bg-ivory px-3 py-2 text-sm md:text-base text-neutral-dark"
            >
              <span className="truncate">{optionsLabel}</span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className="w-[240px] md:w-[320px] lg:w-[380px] border-border-warm bg-ivory p-4"
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
                      className={`rounded-full border px-5 py-3 text-sm font-medium transition-colors ${
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
                  className="rounded-md border border-border-warm px-3 py-1.5 text-sm text-neutral-dark"
                >
                  초기화
                </button>
                <button
                  type="button"
                  onClick={() => setOptionsOpen(false)}
                  className="rounded-md bg-warm-brown px-3 py-1.5 text-sm text-white"
                >
                  적용
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="찾고자 하는 지역을 검색해 주세요."
        className="w-full px-3 md:px-4 py-2 md:py-3 bg-transparent border-b border-border-warm text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:border-warm-brown text-sm md:text-base"
      />
    </div>
  );
}
