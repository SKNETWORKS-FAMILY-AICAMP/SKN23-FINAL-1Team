import { filterOptions } from "@/lib/constants/home";
import { FilterKey } from "@/lib/types/home";
import FilterButton from "./FilterButton";
import DropdownMenu from "./DropdownMenu";

type Props = {
  openFilter: FilterKey | null;
  setOpenFilter: (value: FilterKey | null) => void;
  onOpenStructureModal: () => void;
};

export default function FilterBar({
  openFilter,
  setOpenFilter,
  onOpenStructureModal,
}: Props) {
  const filters: { key: FilterKey; label: string }[] = [
    { key: "dealType", label: "거래 방식" },
    { key: "price", label: "가격" },
    { key: "structure", label: "방 구조" },
    { key: "size", label: "방 크기" },
    { key: "option", label: "옵션" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap lg:gap-5 xl:gap-10">
      {filters.map((filter) => (
        <div key={filter.key} className="relative min-w-0">
          <FilterButton
            label={filter.label}
            open={openFilter === filter.key}
            onClick={() => {
              if (filter.key === "structure") {
                onOpenStructureModal();
                return;
              }

              setOpenFilter(openFilter === filter.key ? null : filter.key);
            }}
          />

          {openFilter === filter.key && filter.key !== "structure" && (
            <DropdownMenu options={filterOptions[filter.key]} />
          )}
        </div>
      ))}
    </div>
  );
}
