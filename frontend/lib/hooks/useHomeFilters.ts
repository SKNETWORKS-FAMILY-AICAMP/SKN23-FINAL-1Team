"use client";

import { useState } from "react";
import { FilterKey, HomeFilters } from "@/lib/types/home";

const initialFilters: HomeFilters = {
  dealType: "전체",
  price: "전체",
  structure: "전체",
  size: "전체",
  option: [],
  region: "",
};

export function useHomeFilters() {
  const [filters, setFilters] = useState<HomeFilters>(initialFilters);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);

  const updateFilter = <K extends keyof HomeFilters>(
    key: K,
    value: HomeFilters[K],
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleOption = (value: string) => {
    setFilters((prev) => {
      const exists = prev.option.includes(value);

      return {
        ...prev,
        option: exists
          ? prev.option.filter((item) => item !== value)
          : [...prev.option, value],
      };
    });
  };

  return {
    filters,
    openFilter,
    setOpenFilter,
    updateFilter,
    toggleOption,
  };
}
