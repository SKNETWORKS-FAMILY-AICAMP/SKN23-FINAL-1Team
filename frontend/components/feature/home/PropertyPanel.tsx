import { Dispatch, SetStateAction } from "react";
import { PropertyItem, TabType } from "@/lib/types/home";
import TabButtons from "./TabButtons";
import PropertyList from "./PropertyList";
import AiRecommendPanel from "./AiRecommendPanel";
import LoadingState from "./LoadingState";
import EmptyState from "./EmptyState";

type Props = {
  activeTab: TabType;
  setActiveTab: Dispatch<SetStateAction<TabType>>;
  items: PropertyItem[];
  loading: boolean;
  error: string;
  selectedStructure: string;
};

export default function PropertyPanel({
  activeTab,
  setActiveTab,
  items,
  loading,
  error,
  selectedStructure,
}: Props) {
  return (
    <aside className="h-full min-h-[320px] bg-neutral-200 px-4 py-5 sm:px-5 sm:py-6 lg:min-h-[640px] lg:px-6 lg:py-8">
      <TabButtons activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="mt-5 overflow-y-auto sm:mt-6 lg:mt-8 lg:h-[calc(100%-72px)] lg:pr-1">
        {activeTab === "ai" ? (
          <AiRecommendPanel selectedStructure={selectedStructure} />
        ) : loading ? (
          <LoadingState />
        ) : error ? (
          <EmptyState message={error} />
        ) : items.length === 0 ? (
          <EmptyState message="조건에 맞는 매물이 없습니다." />
        ) : (
          <PropertyList items={items} />
        )}
      </div>
    </aside>
  );
}
