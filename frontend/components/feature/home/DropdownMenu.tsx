type Props = {
  options: string[];
};

export default function DropdownMenu({ options }: Props) {
  return (
    <div className="absolute left-0 top-[60px] z-20 w-full min-w-[180px] overflow-hidden rounded-md bg-white shadow-lg sm:top-[68px] lg:top-[80px] lg:w-[260px] xl:top-[92px] xl:w-[320px]">
      {options.map((option) => (
        <button
          key={option}
          className="block w-full border-b border-neutral-200 px-4 py-3 text-left text-sm text-black transition last:border-b-0 hover:bg-neutral-100 sm:px-5 sm:text-base lg:px-6 lg:py-4 lg:text-lg xl:px-8 xl:py-5 xl:text-[22px]"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
