"use client";

import { useState } from "react";
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
  price: number;
  structure: string;
  size: string;
  options: string;
}

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const MAX_PRICE = 200;

export function FilterBar({
  filters,
  onFiltersChange,
  searchQuery,
  onSearchChange,
}: FilterBarProps) {
  const [priceOpen, setPriceOpen] = useState(false);

  const updateFilter = (key: keyof Filters, value: string | number) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const priceLabel = filters.price === 0 ? "가격" : `~ ${filters.price}만원`;

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
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="monthly">월세</SelectItem>
            <SelectItem value="jeonse">전세</SelectItem>
          </SelectContent>
        </Select>

        <Popover open={priceOpen} onOpenChange={setPriceOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-[140px] md:w-[160px] lg:w-[160px] flex items-center justify-between rounded-md border border-border-warm bg-ivory px-3 py-2 text-sm md:text-base text-neutral-dark"
            >
              <span className="truncate">
                {filters.price === 0 ? "가격" : `~ ${filters.price}만원`}
              </span>
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
                  최대 가격
                </span>
                <span className="text-sm text-neutral-muted">
                  {filters.price === 0 ? "전체" : `${filters.price}만원`}
                </span>
              </div>

              <Slider
                value={[filters.price]}
                min={0}
                max={MAX_PRICE}
                step={5}
                onValueChange={(value) => updateFilter("price", value[0])}
              />

              <div className="flex justify-between text-xs text-neutral-muted">
                <span>전체</span>
                <span>50</span>
                <span>100</span>
                <span>150</span>
                <span>200+</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => updateFilter("price", 0)}
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
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="open">오픈형</SelectItem>
            <SelectItem value="separated">분리형</SelectItem>
            <SelectItem value="duplex">복층</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.size}
          onValueChange={(v) => updateFilter("size", v)}
        >
          <SelectTrigger className="min-w-[140px] md:min-w-[160px] bg-ivory border-border-warm text-neutral-dark text-sm md:text-base">
            <SelectValue placeholder="방 크기" />
          </SelectTrigger>
          <SelectContent className="w-[140px] md:w-[180px] lg:w-[220px] bg-ivory border-border-warm">
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="under5">5평 이하</SelectItem>
            <SelectItem value="5to10">5~10평</SelectItem>
            <SelectItem value="10to15">10~15평</SelectItem>
            <SelectItem value="over15">15평 이상</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.options}
          onValueChange={(v) => updateFilter("options", v)}
        >
          <SelectTrigger className="min-w-[140px] md:min-w-[160px] bg-ivory border-border-warm text-neutral-dark text-sm md:text-base">
            <SelectValue placeholder="옵션" />
          </SelectTrigger>
          <SelectContent className="w-[140px] md:w-[180px] lg:w-[220px] bg-ivory border-border-warm">
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="aircon">에어컨</SelectItem>
            <SelectItem value="washer">세탁기</SelectItem>
            <SelectItem value="fridge">냉장고</SelectItem>
            <SelectItem value="full">풀옵션</SelectItem>
          </SelectContent>
        </Select>
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
