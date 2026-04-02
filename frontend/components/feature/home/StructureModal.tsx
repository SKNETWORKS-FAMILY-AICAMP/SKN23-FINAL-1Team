const structures = ["전체", "오픈형", "분리형", "복층형"];

type Props = {
  selectedStructure: string;
  onClose: () => void;
  onSelect: (value: string) => void;
};

export default function StructureModal({
  selectedStructure,
  onClose,
  onSelect,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 px-4 backdrop-blur-[2px] sm:px-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[900px] rounded-lg bg-white/60 px-5 py-6 shadow-xl sm:px-8 sm:py-10 lg:px-12 lg:py-14"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:gap-10">
          {structures.map((item) => (
            <button
              key={item}
              onClick={() => onSelect(item)}
              className={`flex h-16 items-center justify-center rounded-2xl border-2 px-4 text-sm font-medium shadow-md transition sm:h-20 sm:text-base md:text-lg lg:h-[120px] lg:text-[24px] ${
                selectedStructure === item
                  ? "border-black bg-black text-white"
                  : "border-black bg-white/70 text-black hover:bg-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
