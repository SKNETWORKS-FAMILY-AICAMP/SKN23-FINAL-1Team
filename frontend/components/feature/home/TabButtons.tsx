import { Dispatch, SetStateAction } from "react";
import { TabType } from "@/lib/types/home";

type Props = {
  activeTab: TabType;
  setActiveTab: Dispatch<SetStateAction<TabType>>;
};

export default function TabButtons({ activeTab, setActiveTab }: Props) {
  return (
    <div className="flex gap-4">
      <button
        onClick={() => setActiveTab("list")}
        className={`rounded-full px-8 py-3 text-[24px] shadow-md transition ${
          activeTab === "list"
            ? "bg-neutral-500 text-white"
            : "bg-white text-black"
        }`}
      >
        매물목록
      </button>

      <button
        onClick={() => setActiveTab("ai")}
        className={`rounded-full px-8 py-3 text-[24px] shadow-md transition ${
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
