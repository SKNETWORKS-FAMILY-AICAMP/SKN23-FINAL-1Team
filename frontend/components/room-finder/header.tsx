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
  "relative rounded-full px-4 py-2.5 text-sm md:text-[15px] font-semibold tracking-tight transition-all duration-200";
const navButtonActive =
  "bg-white text-stone-900 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-stone-200/80";
const navButtonInactive =
  "text-stone-500 hover:bg-white/70 hover:text-stone-800";

export function Header({ roomType, onRoomTypeChange }: HeaderProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  return (
    <header className="border-b border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,244,238,0.94)_100%)] px-4 py-4 backdrop-blur-xl md:px-6">
      <div className="flex items-center justify-between gap-4">
        <nav className="inline-flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/65 p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur-md">
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
        </nav>

        {isLoggedIn && user ? (
          <div className="flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/80 px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.06)] backdrop-blur-sm">
            <span className="max-w-[120px] truncate text-sm font-semibold tracking-tight text-stone-800 md:max-w-none">
              {user.nickname}
            </span>
            <div className="h-5 w-px bg-stone-200" />
            <LogoutButton />
          </div>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="rounded-full border border-stone-300 bg-white/90 px-5 py-2.5 text-sm font-semibold tracking-tight text-stone-800 shadow-[0_8px_20px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-white hover:shadow-[0_12px_24px_rgba(15,23,42,0.10)]"
          >
            로그인
          </button>
        )}
      </div>
    </header>
  );
}
