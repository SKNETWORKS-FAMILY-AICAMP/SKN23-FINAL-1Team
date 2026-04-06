"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface Filters {
  transactionType: string
  price: string
  structure: string
  size: string
  options: string
}

interface FilterBarProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function FilterBar({
  filters,
  onFiltersChange,
  searchQuery,
  onSearchChange,
}: FilterBarProps) {
  const updateFilter = (key: keyof Filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="bg-ivory border-b border-border-warm px-4 md:px-6 py-3 md:py-4 flex flex-col gap-3 md:gap-4">
      {/* Filter Dropdowns - Horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-0 md:grid md:grid-cols-5 scrollbar-hide">
        <Select
          value={filters.transactionType}
          onValueChange={(v) => updateFilter("transactionType", v)}
        >
          <SelectTrigger className="min-w-[100px] md:min-w-0 bg-ivory border-border-warm text-neutral-dark text-sm md:text-base">
            <SelectValue placeholder="거래 방식" />
          </SelectTrigger>
          <SelectContent className="bg-ivory border-border-warm">
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="monthly">월세</SelectItem>
            <SelectItem value="jeonse">전세</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.price}
          onValueChange={(v) => updateFilter("price", v)}
        >
          <SelectTrigger className="min-w-[100px] md:min-w-0 bg-ivory border-border-warm text-neutral-dark text-sm md:text-base">
            <SelectValue placeholder="가격" />
          </SelectTrigger>
          <SelectContent className="bg-ivory border-border-warm">
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="under30">30만원 이하</SelectItem>
            <SelectItem value="30to50">30~50만원</SelectItem>
            <SelectItem value="50to70">50~70만원</SelectItem>
            <SelectItem value="over70">70만원 이상</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.structure}
          onValueChange={(v) => updateFilter("structure", v)}
        >
          <SelectTrigger className="min-w-[100px] md:min-w-0 bg-ivory border-border-warm text-neutral-dark text-sm md:text-base">
            <SelectValue placeholder="방 구조" />
          </SelectTrigger>
          <SelectContent className="bg-ivory border-border-warm">
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
          <SelectTrigger className="min-w-[100px] md:min-w-0 bg-ivory border-border-warm text-neutral-dark text-sm md:text-base">
            <SelectValue placeholder="방 크기" />
          </SelectTrigger>
          <SelectContent className="bg-ivory border-border-warm">
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
          <SelectTrigger className="min-w-[100px] md:min-w-0 bg-ivory border-border-warm text-neutral-dark text-sm md:text-base">
            <SelectValue placeholder="옵션" />
          </SelectTrigger>
          <SelectContent className="bg-ivory border-border-warm">
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
  )
}
