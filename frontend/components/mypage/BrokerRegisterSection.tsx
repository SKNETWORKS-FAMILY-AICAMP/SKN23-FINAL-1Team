"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { BadgeCheck } from "lucide-react";

const PHONE_PATTERN = /^010-\d{4}-\d{4}$/;

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
};

export function BrokerRegisterSection() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL;

  const [name, setName] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const phoneError = useMemo(() => {
    if (!phone) return "";
    return PHONE_PATTERN.test(phone) ? "" : "010-1234-5678 형식으로 입력해주세요.";
  }, [phone]);

  const handleRegister = async () => {
    if (!name.trim() || !officeName.trim() || !phone.trim()) {
      setMessage("모든 필수 항목을 입력해주세요.");
      return;
    }
    if (!PHONE_PATTERN.test(phone.trim())) {
      setMessage("010-1234-5678 형식으로 입력해주세요.");
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
          name: name.trim(),
          office_name: officeName.trim(),
          phone: phone.trim(),
          photo_url: photoUrl.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(data?.detail ?? data?.error ?? "중개사 인증 신청에 실패했습니다.");
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
                중개사 매물 관리 페이지에서 매물을 관리할 수 있어요.
              </p>
            </div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-600">
              중개사 인증 완료 ✓
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-semibold text-stone-700">이름 *</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예) 홍길동"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm focus:border-stone-400 focus:outline-none"
              />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-stone-700">중개사무소명 *</p>
              <input
                type="text"
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                placeholder="예) 금방부동산중개사무소"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm focus:border-stone-400 focus:outline-none"
              />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-stone-700">연락처 *</p>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="010-1234-5678"
                maxLength={13}
                className={cn(
                  "w-full rounded-xl border bg-stone-50 px-3 py-2.5 text-sm focus:outline-none",
                  phoneError
                    ? "border-red-300 focus:border-red-400"
                    : "border-stone-200 focus:border-stone-400",
                )}
              />
              {phoneError && (
                <p className="mt-1 text-xs text-red-500">{phoneError}</p>
              )}
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-stone-700">프로필 이미지 URL</p>
              <input
                type="text"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm focus:border-stone-400 focus:outline-none"
              />
            </div>
            {message && (
              <p className={cn("text-xs", message === "완료" ? "text-blue-500" : "text-red-500")}>
                {message === "완료" ? "중개사 인증이 완료되었습니다! 🎉" : message}
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
              인증 후 중개사 매물 관리 기능이 활성화됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}