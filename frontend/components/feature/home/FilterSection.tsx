import { FilterKey, HomeFilters } from "@/lib/types/home";
import FilterBar from "./FilterBar";
import SearchSection from "./SearchSection";

type Props = {
  filters: HomeFilters;
  openFilter: FilterKey | null;
  setOpenFilter: (value: FilterKey | null) => void;
  updateFilter: <K extends keyof HomeFilters>(
    key: K,
    value: HomeFilters[K],
  ) => void;
  toggleOption: (value: string) => void;
  onOpenRegionModal: () => void;
  onOpenStructureModal: () => void;
};

export default function FilterSection({
  filters,
  openFilter,
  setOpenFilter,
  updateFilter,
  toggleOption,
  onOpenRegionModal,
  onOpenStructureModal,
}: Props) {
  return (
    <div className="space-y-6 lg:space-y-10">
      <FilterBar
        filters={filters}
        openFilter={openFilter}
        setOpenFilter={setOpenFilter}
        updateFilter={updateFilter}
        toggleOption={toggleOption}
        onOpenStructureModal={onOpenStructureModal}
      />

      <SearchSection
        selectedRegion={filters.region || "지역을 선택하세요"}
        onClickRegion={onOpenRegionModal}
      />
    </div>
  );
}
