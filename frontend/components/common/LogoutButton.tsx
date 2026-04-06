"use client";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useAuthStore } from "@/store/authStore";

export default function Logout() {
  const clearUser = useAuthStore((state) => state.clearUser);

  const handleLogout = async () => {
    clearUser();
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <>
      <button
        className="p-2 text-neutral-dark hover:text-neutral-muted transition-colors"
        aria-label="로그아웃"
        onClick={handleLogout}
      >
        <LogOut className="h-5 w-5" />
      </button>
    </>
  );
}
