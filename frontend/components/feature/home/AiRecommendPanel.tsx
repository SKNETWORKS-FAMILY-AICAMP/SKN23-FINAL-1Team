type Props = {
  selectedStructure: string;
};

export default function AiRecommendPanel({ selectedStructure }: Props) {
  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="rounded-md bg-white/70 p-4 text-sm text-black sm:p-5 sm:text-base md:text-lg lg:text-[20px]">
        최근 선택한 방 구조는 "{selectedStructure}" 입니다.
      </div>

      <div className="rounded-md bg-white/70 p-4 text-sm text-neutral-600 sm:p-5 sm:text-base">
        AI 추천 영역입니다. 이후 여기에 생성 이미지, 선택 이미지, 추천 설명을
        붙이면 됩니다.
      </div>

      <div className="flex flex-col gap-3 rounded-md bg-white/70 p-4 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="flex-1 text-sm text-neutral-500 sm:text-base">
          예: 북측 창문이 3개 있고 채광이 좋은 방을 찾고 싶어요
        </p>
        <button className="w-full rounded-xl border-2 border-black px-4 py-2 text-sm text-black transition hover:bg-black hover:text-white sm:text-base lg:w-auto lg:shrink-0 lg:text-[18px]">
          입력
        </button>
      </div>
    </div>
  );
}
