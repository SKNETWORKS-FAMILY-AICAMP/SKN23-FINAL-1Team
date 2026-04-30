"use client";

import type { FavoriteToastState } from "@/hooks/useFavoriteToast";

interface ToastProps {
  toast: FavoriteToastState | null;
  onClose: () => void;
}

const borderColor: Record<string, string> = {
  add: "border-[#0F6E56]",
  remove: "border-[#993C1D]",
  success: "border-[#0F6E56]",
  error: "border-[#993C1D]",
  info: "border-stone-300",
};

export function Toast({ toast, onClose }: ToastProps) {
  if (!toast) return null;

  const isPositive = toast.type === "add";

  return (
    <div
      style={{ animation: "slideInFromRight 0.35s cubic-bezier(0.16,1,0.3,1) forwards" }}
      className={`fixed top-5 right-5 z-[9998] flex items-center gap-2.5 rounded-xl border bg-white px-4 py-2.5 shadow-lg ${borderColor[toast.type] ?? "border-stone-300"}`}
    >
      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path
          d="M7.5 13C7.5 13 1.5 9 1.5 5.5C1.5 3.5 3 2 5 2C6.2 2 7.5 3 7.5 3C7.5 3 8.8 2 10 2C12 2 13.5 3.5 13.5 5.5C13.5 9 7.5 13 7.5 13Z"
          fill={isPositive ? "#f43f5e" : "none"}
          stroke={isPositive ? "#f43f5e" : "#999"}
          strokeWidth="1.2"
        />
      </svg>
      <span className="text-[13px] font-medium text-stone-800">{toast.message}</span>
      <button
        type="button"
        onClick={onClose}
        className="ml-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <line x1="1" y1="1" x2="7" y2="7" stroke="#666" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="7" y1="1" x2="1" y2="7" stroke="#666" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}
