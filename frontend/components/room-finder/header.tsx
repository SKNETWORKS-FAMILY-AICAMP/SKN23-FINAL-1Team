"use client";

import LogoutButton from "@/components/common/LogoutButton";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

interface HeaderProps {
  roomType: "oneroom" | "tworoom";
  onRoomTypeChange: (type: "oneroom" | "tworoom") => void;
}

export function Header({ roomType, onRoomTypeChange }: HeaderProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-cream">
      <nav className="flex items-center gap-4 md:gap-8">
        <button
          onClick={() => onRoomTypeChange("oneroom")}
          className={cn(
            "text-base md:text-lg font-medium transition-colors",
            roomType === "oneroom"
              ? "text-neutral-dark"
              : "text-neutral-muted hover:text-neutral-dark",
          )}
        >
          원룸
        </button>
        <button
          onClick={() => onRoomTypeChange("tworoom")}
          className={cn(
            "text-base md:text-lg font-medium transition-colors",
            roomType === "tworoom"
              ? "text-neutral-dark"
              : "text-neutral-muted hover:text-neutral-dark",
          )}
        >
          투룸
        </button>
        <button
          onClick={() => router.push("/mypage")}
          className={cn(
            "text-base md:text-lg font-medium transition-colors",
            roomType === "tworoom"
              ? "text-neutral-dark"
              : "text-neutral-muted hover:text-neutral-dark",
          )}
        >
          마이페이지
        </button>
      </nav>
      {isLoggedIn && user ? (
        <>
          <span className="text-sm md:text-base font-medium text-neutral-dark">
            {user.nickname}
          </span>
          <LogoutButton />
        </>
      ) : (
        <button
          onClick={() => router.push("/login")}
          className="rounded-md px-4 py-2 text-sm md:text-base font-medium text-neutral-dark border border-neutral-dark hover:bg-neutral-dark hover:text-white transition-colors"
        >
          로그인
        </button>
      )}
    </header>
  );
}
