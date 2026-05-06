"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { Heart, Clock, Sparkles, Settings, Menu, X, Building2, BadgeCheck } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import Logo from "@/assets/Logo.png";
import { LikedSection } from "@/components/mypage/LikedSection";
import { RecentSection } from "@/components/mypage/RecentSection";
import { GallerySection } from "@/components/mypage/GallerySection";
import { SettingsSection } from "@/components/mypage/SettingsSection";
import { BrokerSection } from "@/components/mypage/BrokerSection";
import { BrokerRegisterSection } from "@/components/mypage/BrokerRegisterSection";

type Section = "liked" | "recent" | "gallery" | "broker-register" | "broker" | "settings";

export default function MyPage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>("liked");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,244,238,0.94)_100%)]">
        <div className="text-sm font-medium text-stone-500">
          사용자 정보를 불러오는 중입니다.
        </div>
      </div>
    );
  }

  const getSocialBadge = (socialType?: string | null) => {
    switch (socialType) {
      case "kakao":
        return { label: "카카오 연동", className: "bg-[#FEE500] text-[#3C1E1E] border-[#FEE500]", icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.542 1.574 4.778 3.938 6.112L4.5 21l4.986-2.697A11.3 11.3 0 0 0 12 18.5c5.523 0 10-3.477 10-7.5S17.523 3 12 3z" /></svg>) };
      case "naver":
        return { label: "네이버 연동", className: "bg-[#03C75A] text-white border-[#03C75A]", icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" /></svg>) };
      case "google":
        return { label: "구글 연동", className: "bg-white text-stone-600 border-stone-200", icon: (<svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84z"/></svg>) };
      default:
        return { label: socialType ?? "social", className: "bg-stone-100 text-stone-500 border-stone-200", icon: null };
    }
  };

  const badge = getSocialBadge(user.social_type ?? null);

  const navItems = [
    { id: "liked" as Section, label: "찜한 매물", icon: Heart },
    { id: "recent" as Section, label: "최근 본 매물", icon: Clock },
    { id: "gallery" as Section, label: "AI 생성 갤러리", icon: Sparkles },
    { id: "broker-register" as Section, label: "중개사 인증", icon: BadgeCheck },
    ...(user.role === "BROKER"
      ? [{ id: "broker" as Section, label: "중개사 매물관리", icon: Building2 }]
      : []),
    { id: "settings" as Section, label: "계정 설정", icon: Settings },
  ];

  const handleNavClick = (id: Section) => {
    setActiveSection(id);
    setSidebarOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div className="border-b border-stone-200/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-base font-bold text-stone-500">
            {user.nickname?.charAt(0) ?? "?"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-bold tracking-tight text-stone-900">{user.nickname}</p>
              {user.role === "BROKER" && (
                <span className="flex-shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
                  중개사
                </span>
              )}
            </div>
            <p className="truncate text-xs text-stone-400">{user.email}</p>
          </div>
        </div>
        <div className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold", badge.className)}>
          {badge.icon}
          {badge.label}
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleNavClick(id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold tracking-tight transition-all duration-200",
              activeSection === id
                ? "border-stone-800 bg-stone-100/80 text-stone-900"
                : "border-transparent text-stone-500 hover:bg-stone-50 hover:text-stone-800",
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>
    </>
  );

  return (
    <div className="flex h-screen flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,244,238,0.94)_100%)]">
      <header className="border-b border-stone-200/80 bg-white/70 backdrop-blur-xl">
        <div className="flex h-16 items-center">
          <div className="flex h-full w-14 flex-shrink-0 items-center justify-center border-r border-stone-200/80 md:w-56">
            <button onClick={() => setSidebarOpen(true)} className="flex items-center justify-center md:hidden">
              <Menu className="h-5 w-5 text-stone-500" />
            </button>
            <Image src={Logo} alt="로고" width={120} height={40} className="hidden cursor-pointer object-contain md:block" onClick={() => router.push("/home")} />
          </div>
          <p className="flex-1 text-center text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400">My Page</p>
          <div className="flex w-14 flex-shrink-0 justify-end px-3 md:w-56 md:px-6">
            <button onClick={() => router.back()} className="inline-flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/65 px-3 py-2 text-xs font-semibold tracking-tight text-stone-500 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur-md transition-all duration-200 hover:text-stone-800 md:px-4 md:py-2.5 md:text-sm">
              <span className="hidden md:inline">돌아가기 →</span>
              <span className="md:hidden">←</span>
            </button>
          </div>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        {sidebarOpen && <div className="absolute inset-0 z-20 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />}
        <aside className={cn("absolute z-30 flex h-full w-72 flex-shrink-0 flex-col border-r border-stone-200/80 bg-white/95 backdrop-blur-md transition-transform duration-300 md:relative md:w-56 md:translate-x-0 md:bg-white/70", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex items-center justify-between border-b border-stone-200/80 px-5 py-4 md:hidden">
            <Image src={Logo} alt="로고" width={100} height={32} className="object-contain" />
            <button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5 text-stone-400" /></button>
          </div>
          <SidebarContent />
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeSection === "liked" && <LikedSection userId={user.user_id!} />}
          {activeSection === "recent" && <RecentSection />}
          {activeSection === "gallery" && <GallerySection userId={user.user_id!} />}
          {activeSection === "broker-register" && <BrokerRegisterSection />}
          {activeSection === "broker" && <BrokerSection userId={user.user_id!} />}
          {activeSection === "settings" && <SettingsSection />}
        </main>
      </div>
    </div>
  );
}