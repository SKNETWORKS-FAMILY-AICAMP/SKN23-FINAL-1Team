"use client";

import { useEffect, useState } from "react";
import { HomeFilters, PropertyItem } from "@/types/home";
import { fetchProperties } from "@/lib/api/homeApi";

export function usePropertySearch(filters: HomeFilters) {
  const [items, setItems] = useState<PropertyItem[]>([]);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!filters.region.trim()) {
        setItems([]);
        setCenter(null);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const result = await fetchProperties(filters);
        setItems(result.items ?? []);
        setCenter(result.center ?? null);
      } catch {
        setItems([]);
        setCenter(null);
        setError("매물 조회에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [filters]);

  return {
    items,
    center,
    loading,
    error,
  };
}
