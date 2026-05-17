"use client";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useAuthStore } from "@/store/authStore";
import { useI18n } from "@/lib/i18n";

export default function Logout() {
  const { locale, t } = useI18n();
  const clearUser = useAuthStore((state) => state.clearUser);

  const handleLogout = async () => {
    clearUser();
    await signOut({ callbackUrl: `/${locale}/login` });
  };

  return (
    <>
      <button
        className="p-2 text-neutral-dark hover:text-neutral-muted transition-colors"
        aria-label={t("common.logout")}
        onClick={handleLogout}
      >
        <LogOut className="h-5 w-5" />
      </button>
    </>
  );
}
