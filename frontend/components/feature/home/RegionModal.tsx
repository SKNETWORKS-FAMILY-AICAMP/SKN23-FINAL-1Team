const regions = [
  "가산디지털단지역",
  "서울시 금천구 독산동",
  "서울시 금천구 가산동",
];

type Props = {
  selectedRegion: string;
  onClose: () => void;
  onSelect: (value: string) => void;
};

export default function RegionModal({
  selectedRegion,
  onClose,
  onSelect,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 px-4 backdrop-blur-[2px] sm:px-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[900px] rounded-lg bg-white/80 px-5 py-6 shadow-xl sm:px-8 sm:py-10 lg:px-10 lg:py-12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6 sm:space-y-8 lg:space-y-10">
          {regions.map((region) => (
            <button
              key={region}
              onClick={() => onSelect(region)}
              className={`block w-full border-b border-neutral-400 pb-3 text-left text-lg font-medium transition sm:text-2xl lg:pb-4 lg:text-[32px] ${
                selectedRegion === region
                  ? "text-black"
                  : "text-neutral-500 hover:text-black"
              }`}
            >
              {region}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
