export default function Header() {
  return (
    <header className="border border-black bg-[#f1f0e4]">
      <div className="mx-auto flex h-8 w-full items-center justify-between px-4 sm:h-16 sm:px-6 md:px-8 lg:px-10 xl:px-14">
        <div className="flex items-center gap-6 text-2xl font-semibold text-black sm:gap-8 sm:text-3xl md:text-4xl lg:gap-12 lg:text-5xl xl:gap-16">
          <button className="whitespace-nowrap transition hover:opacity-70 hover:text-white  rounded-md px-2 py-1">
            원룸
          </button>
          <button className="whitespace-nowrap transition hover:opacity-70 hover:text-white rounded-md px-2 py-1 ">
            투룸
          </button>
        </div>

        <button className="shrink-0 text-3xl font-light leading-none text-black transition hover:opacity-70 sm:text-4xl md:text-5xl lg:text-6xl">
          ↪
        </button>
      </div>
    </header>
  );
}
