"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { BadgeCheck } from "lucide-react";

export function BrokerRegisterSection() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [officeName, setOfficeName] = useState("");
  const [brokerNumber, setBrokerNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL;

  const handleRegister = async () => {
    if (!officeName.trim() || !brokerNumber.trim()) {
      setMessage("모든 항목을 입력해주세요.");
      return;
    }

    if (!user?.user_id) {
      setMessage("로그인 정보를 확인할 수 없습니다.");
      return;
    }

    if (!apiBaseUrl) {
      setMessage("API 주소가 설정되지 않았습니다.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${apiBaseUrl}/api/user-role/register-broker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.user_id,
          office_name: officeName,
          broker_number: brokerNumber,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setMessage(err?.detail ?? "인증 신청에 실패했습니다.");
        return;
      }

      updateUser({ role: "BROKER" });
      setMessage("완료");
    } catch {
      setMessage("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-400 md:mb-4">
        중개사 인증
      </p>
      <div className="rounded-[20px] border border-stone-200/80 bg-white/80 p-6">
        {user?.role === "BROKER" ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <BadgeCheck className="h-8 w-8 text-blue-500" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-stone-800">인증된 중개사입니다</p>
              <p className="mt-1 text-sm text-stone-400">
                중개사 매물관리 페이지에서 매물을 관리할 수 있어요.
              </p>
            </div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-600">
              중개사 인증 완료
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-semibold text-stone-700">사무소명 *</p>
              <input
                type="text"
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                placeholder="예: 금방부동산중개사무소"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm focus:border-stone-400 focus:outline-none"
              />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-stone-700">중개사 등록번호 *</p>
              <input
                type="text"
                value={brokerNumber}
                onChange={(e) => setBrokerNumber(e.target.value)}
                placeholder="예: 11680-2024-00123"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm focus:border-stone-400 focus:outline-none"
              />
            </div>
            {message && (
              <p className={cn("text-xs", message === "완료" ? "text-blue-500" : "text-red-500")}>
                {message === "완료" ? "중개사 인증이 완료되었습니다." : message}
              </p>
            )}
            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full rounded-xl bg-stone-800 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "처리 중..." : "인증 신청"}
            </button>
            <p className="text-center text-xs text-stone-400">
              인증 후 중개사 매물관리 기능이 활성화됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}