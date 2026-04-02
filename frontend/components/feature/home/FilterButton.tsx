type Props = {
  label: string;
  open?: boolean;
  onClick: () => void;
};

export default function FilterButton({ label, open, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex h-14 w-full min-w-0 items-center justify-between rounded-md bg-white px-3 text-sm font-medium text-black shadow-md transition hover:bg-neutral-50 sm:h-16 sm:px-4 sm:text-base md:text-lg lg:h-[72px] lg:w-[200px] lg:px-5 lg:text-[20px] xl:h-20 xl:w-[240px] xl:text-[24px]"
    >
      <span className="truncate">{label}</span>
      <span className="ml-2 shrink-0 text-xs leading-none sm:text-sm lg:text-base">
        {open ? "▲" : "▼"}
      </span>
    </button>
  );
}
