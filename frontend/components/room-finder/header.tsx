"use client";

import LogoutButton from "@/components/common/LogoutButton";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

interface HeaderProps {
  roomType: "oneroom" | "tworoom";
  onRoomTypeChange: (type: "oneroom" | "tworoom") => void;
}

const navButtonBase =
  "relative shrink-0 whitespace-nowrap rounded-full px-2.5 py-2 text-[12px] sm:px-3.5 sm:py-2.5 sm:text-sm md:text-[15px] font-semibold tracking-tight transition-all duration-200";
const navButtonActive =
  "bg-white text-stone-900 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-stone-200/80";
const navButtonInactive =
  "text-stone-500 hover:bg-white/70 hover:text-stone-800";

export function Header({ roomType, onRoomTypeChange }: HeaderProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  return (
    <header className="border-b border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,244,238,0.94)_100%)] px-3 py-3 backdrop-blur-xl sm:px-4 md:px-6 md:py-4">
      <div className="flex min-w-0 items-center justify-between gap-2 rounded-full border border-stone-200/80 bg-white/65 px-2 py-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur-md sm:gap-3 sm:px-3 sm:py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-hide sm:gap-2">
          <button
            onClick={() => onRoomTypeChange("oneroom")}
            className={cn(
              navButtonBase,
              roomType === "oneroom" ? navButtonActive : navButtonInactive,
            )}
          >
            원룸
          </button>

          <button
            onClick={() => onRoomTypeChange("tworoom")}
            className={cn(
              navButtonBase,
              roomType === "tworoom" ? navButtonActive : navButtonInactive,
            )}
          >
            투룸
          </button>

          <button
            onClick={() => router.push("/mypage")}
            className={cn(navButtonBase, navButtonInactive)}
          >
            마이페이지
          </button>
        </div>

        {isLoggedIn && user ? (
          <div className="ml-2 flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="max-w-[72px] truncate text-[12px] font-semibold tracking-tight text-stone-800 sm:max-w-[120px] sm:text-sm md:max-w-none">
              {user.nickname}
            </span>
            <div className="h-4 w-px bg-stone-200 sm:h-5" />
            <LogoutButton />
          </div>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="ml-2 shrink-0 rounded-full px-2.5 py-2 text-[12px] font-semibold tracking-tight text-stone-800 transition-all duration-200 hover:bg-white/70 sm:px-4 sm:text-sm"
          >
            로그인
          </button>
        )}
      </div>
    </header>
  );
}
