"use client"

import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

interface HeaderProps {
  roomType: "oneroom" | "tworoom"
  onRoomTypeChange: (type: "oneroom" | "tworoom") => void
}

export function Header({ roomType, onRoomTypeChange }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-cream">
      <nav className="flex items-center gap-4 md:gap-8">
        <button
          onClick={() => onRoomTypeChange("oneroom")}
          className={cn(
            "text-base md:text-lg font-medium transition-colors",
            roomType === "oneroom"
              ? "text-neutral-dark"
              : "text-neutral-muted hover:text-neutral-dark"
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
              : "text-neutral-muted hover:text-neutral-dark"
          )}
        >
          투룸
        </button>
      </nav>
      <button
        className="p-2 text-neutral-dark hover:text-neutral-muted transition-colors"
        aria-label="로그아웃"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </header>
  )
}
