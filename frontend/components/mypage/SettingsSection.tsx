"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  onLogout?: () => void;
}

export function SettingsSection({ onLogout }: SettingsSectionProps) {
  const menuItems = [
    { label: "닉네임 변경", onClick: () => {} },
    { label: "알림 설정", onClick: () => {} },
    { label: "소셜 계정 연동", onClick: () => {} },
    { label: "서비스 이용약관", onClick: () => {} },
  ];

  return (
    <div>
      <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400 md:mb-4">
        계정 설정
      </p>
      <div className="rounded-[20px] border border-stone-200/80 bg-white/80 px-4">
        {menuItems.map((item, idx) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={cn(
              "flex w-full items-center justify-between py-4 text-sm font-semibold tracking-tight text-stone-700 transition-colors duration-200 hover:text-stone-900",
              idx < menuItems.length - 1 && "border-b border-stone-200/80",
            )}
          >
            <span>{item.label}</span>
            <ChevronRight className="h-4 w-4 text-stone-400" />
          </button>
        ))}
        <div className="border-t border-stone-200/80 py-4">
          <button className="text-sm font-semibold text-red-500 transition-colors hover:text-red-600">
            회원탈퇴
          </button>
        </div>
      </div>
    </div>
  );
}
