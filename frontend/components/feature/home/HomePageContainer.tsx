"use client";

import { useState } from "react";
import { TabType } from "@/lib/types/home";
import { useHomeFilters } from "@/lib/hooks/useHomeFilters";
import { usePropertySearch } from "@/lib/hooks/usePropertySearch";
import FilterSection from "./FilterSection";
import MapSection from "./MapSection";
import PropertyPanel from "./PropertyPanel";
import RegionModal from "./RegionModal";
import StructureModal from "./StructureModal";

export default function HomePageContainer() {
  const [activeTab, setActiveTab] = useState<TabType>("list");
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);

  const { filters, openFilter, setOpenFilter, updateFilter, toggleOption } =
    useHomeFilters();

  const { items, center, loading, error } = usePropertySearch(filters);

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-[1440px] flex-col px-4 py-6 sm:px-6 md:px-8 lg:px-10 lg:py-10 xl:py-12">
        <FilterSection
          filters={filters}
          openFilter={openFilter}
          setOpenFilter={setOpenFilter}
          updateFilter={updateFilter}
          toggleOption={toggleOption}
          onOpenRegionModal={() => setIsRegionModalOpen(true)}
          onOpenStructureModal={() => setIsStructureModalOpen(true)}
        />

        <div className="mt-6 grid grid-cols-1 overflow-hidden rounded-sm shadow-sm lg:mt-10 lg:grid-cols-12">
          <div className="min-h-[280px] sm:min-h-[360px] md:min-h-[420px] lg:col-span-8 lg:min-h-[640px]">
            <MapSection center={center} region={filters.region} />
          </div>

          <div className="min-h-[320px] lg:col-span-4 lg:min-h-[640px]">
            <PropertyPanel
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              items={items}
              loading={loading}
              error={error}
              selectedStructure={filters.structure}
            />
          </div>
        </div>
      </section>

      {isRegionModalOpen && (
        <RegionModal
          onClose={() => setIsRegionModalOpen(false)}
          onSelect={(region) => {
            updateFilter("region", region);
            setIsRegionModalOpen(false);
          }}
        />
      )}

      {isStructureModalOpen && (
        <StructureModal
          onClose={() => setIsStructureModalOpen(false)}
          onSelect={(structure) => {
            updateFilter("structure", structure);
            setIsStructureModalOpen(false);
          }}
        />
      )}
    </main>
  );
}
