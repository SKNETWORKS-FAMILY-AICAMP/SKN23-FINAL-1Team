type Props = {
  selectedRegion: string;
  onClickRegion: () => void;
};

export default function SearchSection({
  selectedRegion,
  onClickRegion,
}: Props) {
  return (
    <div className="flex justify-center">
      <button
        onClick={onClickRegion}
        className="w-full max-w-[800px] border-b border-neutral-500 pb-2 text-left text-lg font-medium text-black transition hover:opacity-80 sm:text-xl md:text-2xl lg:pb-3 lg:text-[28px] xl:text-[32px]"
      >
        {selectedRegion}
      </button>
    </div>
  );
}
