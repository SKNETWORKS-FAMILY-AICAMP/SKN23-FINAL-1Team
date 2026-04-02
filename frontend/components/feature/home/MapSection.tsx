type Props = {
  center: { lat: number; lng: number } | null;
  region: string;
};

export default function MapSection({ center, region }: Props) {
  return (
    <div className="flex h-full min-h-[280px] items-center justify-center bg-neutral-200 p-4 text-center sm:min-h-[360px] md:min-h-[420px] lg:min-h-[640px]">
      <div className="space-y-3 rounded-lg bg-white/80 px-6 py-5 shadow-md">
        <p className="text-base font-semibold sm:text-lg lg:text-2xl">
          지도 영역
        </p>
        <p className="text-sm text-neutral-700 sm:text-base">
          선택 지역: {region || "없음"}
        </p>
        <p className="text-xs text-neutral-500 sm:text-sm">
          {center
            ? `lat: ${center.lat}, lng: ${center.lng}`
            : "지역 좌표가 없습니다."}
        </p>
      </div>
    </div>
  );
}
