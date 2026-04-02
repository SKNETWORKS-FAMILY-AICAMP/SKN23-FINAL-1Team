type Props = {
  options: string[];
};

export default function FilterDropdown({ options }: Props) {
  return (
    <div className="absolute left-0 top-[92px] z-20 w-[400px] bg-white shadow-lg">
      {options.map((option) => (
        <button
          key={option}
          className="block w-full px-10 py-6 text-left text-2xl hover:bg-gray-100"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
