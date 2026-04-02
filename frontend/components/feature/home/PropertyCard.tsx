import Image from "next/image";
import { PropertyItem } from "@/lib/types/home";

type Props = {
  item: PropertyItem;
};

export default function PropertyCard({ item }: Props) {
  return (
    <div className="flex gap-3 rounded-md bg-white/70 p-3 sm:gap-4 sm:p-4 lg:gap-5 lg:p-5">
      <div className="relative h-[72px] w-[96px] shrink-0 overflow-hidden rounded sm:h-[84px] sm:w-[116px] lg:h-[92px] lg:w-[130px]">
        <Image
          src={item.imageUrl}
          alt={item.title}
          fill
          className="object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-col justify-center text-sm leading-[1.4] text-black sm:text-base lg:text-[18px]">
        <p className="truncate font-semibold">{item.title}</p>
        <p className="truncate text-neutral-600">{item.address}</p>
        <p>{item.priceText}</p>
        <p>{item.sizeText}</p>
      </div>
    </div>
  );
}
