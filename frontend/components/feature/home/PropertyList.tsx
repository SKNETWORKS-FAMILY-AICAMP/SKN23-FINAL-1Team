import { Dispatch, SetStateAction } from "react";
import { TabType } from "@/lib/types/home";

type Props = {
  activeTab: TabType;
  setActiveTab: Dispatch<SetStateAction<TabType>>;
};

export default function TabButtons({ activeTab, setActiveTab }: Props) {
  return (
    <div className="flex flex-wrap gap-3 sm:gap-4">
      <button
        onClick={() => setActiveTab("list")}
        className={`rounded-full px-4 py-2 text-sm shadow-md transition sm:px-6 sm:text-base md:text-lg lg:px-8 lg:py-3 lg:text-[24px] ${
          activeTab === "list"
            ? "bg-neutral-500 text-white"
            : "bg-white text-black"
        }`}
      >
        매물목록
      </button>

      <button
        onClick={() => setActiveTab("ai")}
        className={`rounded-full px-4 py-2 text-sm shadow-md transition sm:px-6 sm:text-base md:text-lg lg:px-8 lg:py-3 lg:text-[24px] ${
          activeTab === "ai"
            ? "bg-white text-black"
            : "bg-neutral-500 text-white"
        }`}
      >
        AI 추천
      </button>
    </div>
  );
}
