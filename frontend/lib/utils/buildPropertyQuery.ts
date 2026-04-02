import { HomeFilters } from "@/lib/types/home";

export function buildPropertyQuery(filters: HomeFilters) {
  const params = new URLSearchParams();

  if (filters.region.trim()) params.set("region", filters.region);
  if (filters.dealType !== "전체") params.set("dealType", filters.dealType);
  if (filters.price !== "전체") params.set("price", filters.price);
  if (filters.structure !== "전체") params.set("structure", filters.structure);
  if (filters.size !== "전체") params.set("size", filters.size);

  filters.option.forEach((item) => {
    params.append("option", item);
  });

  return params.toString();
}
