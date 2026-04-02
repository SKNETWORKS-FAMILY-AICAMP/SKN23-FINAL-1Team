type Props = {
  message: string;
};

export default function EmptyState({ message }: Props) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-md bg-white/70 px-4 text-center text-sm text-neutral-600 sm:text-base">
      {message}
    </div>
  );
}
