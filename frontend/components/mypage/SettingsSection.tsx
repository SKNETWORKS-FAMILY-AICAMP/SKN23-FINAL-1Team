"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

interface SettingsSectionProps {
  onLogout?: () => void;
}

export function SettingsSection({ onLogout }: SettingsSectionProps) {
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { update: updateSession } = useSession();
  const router = useRouter();
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [nicknameLoading, setNicknameLoading] = useState(false);
  const [nicknameMsg, setNicknameMsg] = useState<string | null>(null);
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const toggle = (label: string) => {
    setOpenItem((prev) => (prev === label ? null : label));
  };

  const handleNicknameUpdate = async () => {
    if (!user?.user_id) return;
    if (!nickname.trim()) { setNicknameMsg("닉네임을 입력해주세요."); return; }
    setNicknameLoading(true);
    setNicknameMsg(null);
    try {
      const res = await fetch(`${apiUrl}/api/user-role/nickname`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id, nickname: nickname.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setNicknameMsg(err?.detail ?? "닉네임 변경에 실패했습니다.");
        return;
      }
      const data = (await res.json().catch(() => null)) as
        | { nickname?: string }
        | null;
      const nextNickname = data?.nickname ?? nickname.trim();
      updateUser({ nickname: nextNickname });
      await updateSession({ nickname: nextNickname });
      setNicknameMsg("닉네임이 변경되었습니다!");
    } catch {
      setNicknameMsg("오류가 발생했습니다.");
    } finally {
      setNicknameLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user?.user_id) return;
    setWithdrawLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/user-role/withdraw/${user.user_id}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      await signOut({ redirect: false });
      clearUser();
      router.push("/");
    } catch {
      console.error("회원탈퇴 실패");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const menuItems = [
    {
      label: "닉네임 변경",
      content: (
        <div className="pb-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <input
                type="text"
                value={nickname}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length <= 12) {
                    setNickname(val);
                    setNicknameMsg(null);
                  }
                }}
                placeholder="새 닉네임 입력"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 pr-12 text-sm focus:border-stone-400 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                {nickname.length}/12
              </span>
            </div>
            <button
              onClick={handleNicknameUpdate}
              disabled={nicknameLoading}
              className="rounded-xl bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer sm:w-auto"
            >
              {nicknameLoading ? "저장 중..." : "저장"}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-stone-400">영문, 한글, 숫자만 사용 가능 · 최대 12자</p>
          {nicknameMsg && (
            <p className={`mt-1 text-xs ${nicknameMsg.includes("변경") ? "text-green-500" : "text-red-500"}`}>
              {nicknameMsg}
            </p>
          )}
        </div>
      ),
    },
    {
      label: "소셜 계정 연동",
      content: (
        <div className="pb-4">
          <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
            {user?.social_type === "kakao" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEE500]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#3C1E1E">
                  <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.542 1.574 4.778 3.938 6.112L4.5 21l4.986-2.697A11.3 11.3 0 0 0 12 18.5c5.523 0 10-3.477 10-7.5S17.523 3 12 3z" />
                </svg>
              </div>
            )}
            {user?.social_type === "naver" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#03C75A]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
                </svg>
              </div>
            )}
            {user?.social_type === "google" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-stone-200">
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84z"/>
                </svg>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-stone-700">
                {user?.social_type === "kakao" ? "카카오" :
                 user?.social_type === "naver" ? "네이버" :
                 user?.social_type === "google" ? "구글" : "소셜 계정"}
              </p>
              <p className="text-xs text-stone-400">연동됨</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: "서비스 이용약관",
      content: (
        <div className="max-h-48 overflow-y-auto rounded-xl bg-stone-50 p-3 pb-4 text-xs leading-relaxed text-stone-500">
          <p className="mb-2 font-semibold text-stone-700">서비스 이용약관</p>
          <p className="mb-2">본 약관은 금방 서비스(이하 "서비스")의 이용 조건 및 절차, 이용자와 회사의 권리, 의무 및 책임 사항을 규정합니다.</p>
          <p className="mb-2">제1조 (목적) 본 약관은 금방이 제공하는 AI 기반 원룸/투룸 매물 검색 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
          <p className="mb-2">제2조 (정의) "서비스"란 회사가 제공하는 모든 서비스를 의미합니다. "이용자"란 본 약관에 따라 서비스를 이용하는 자를 의미합니다.</p>
          <p className="mb-2">제3조 (약관의 효력) 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</p>
          <p className="mb-2">제4조 (개인정보 보호) 회사는 관련 법령이 정하는 바에 따라 이용자의 개인정보를 보호하기 위해 노력합니다.</p>
          <p className="mb-2">제5조 (저작권 및 면책)</p>
          <p className="mb-2">본 서비스는 교육 및 포트폴리오 목적으로 제작된 비상업적 프로젝트입니다. 서비스에서 제공되는 매물 데이터는 직방(zigbang.com)의 공개 데이터를 활용하였으며, 상업적 목적으로 사용되지 않습니다. 모든 저작권은 원저작자에게 있습니다.</p>
        </div>
      ),
    },
  ];

  return (
    <div>
      <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400 md:mb-4">
        계정 설정
      </p>
      <div className="rounded-[20px] border border-stone-200/80 bg-white/80 px-4">
        {menuItems.map((item, idx) => (
          <div
            key={item.label}
            className={cn(idx < menuItems.length - 1 && "border-b border-stone-200/80")}
          >
            <button
              onClick={() => toggle(item.label)}
              className="flex w-full items-center justify-between py-4 text-sm font-semibold tracking-tight text-stone-700 transition-colors duration-200 hover:text-stone-900 cursor-pointer"
            >
              <span>{item.label}</span>
              <ChevronDown className={cn("h-4 w-4 text-stone-400 transition-transform duration-200", openItem === item.label && "rotate-180")} />
            </button>
            {openItem === item.label && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                {item.content}
              </div>
            )}
          </div>
        ))}
        <div className="border-t border-stone-200/80 py-4">
          {!withdrawConfirm ? (
            <button
              onClick={() => setWithdrawConfirm(true)}
              className="text-sm font-semibold text-red-500 transition-colors hover:text-red-600 cursor-pointer"
            >
              회원탈퇴
            </button>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="text-sm text-stone-500">정말 탈퇴하시겠어요?</span>
              <button
                onClick={handleWithdraw}
                disabled={withdrawLoading}
                className="text-sm font-semibold text-red-500 hover:text-red-600 cursor-pointer disabled:opacity-50"
              >
                {withdrawLoading ? "처리 중..." : "확인"}
              </button>
              <button
                onClick={() => setWithdrawConfirm(false)}
                className="text-sm font-semibold text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                취소
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
