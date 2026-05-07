"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { BadgeCheck, Upload, X } from "lucide-react";

const PHONE_PATTERN = /^(010-\d{4}-\d{4}|0\d{1,2}-\d{3,4}-\d{4})$/;

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.startsWith("010")) {
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  } else {
    // 지역번호 (02, 031, 032 등)
    if (numbers.length <= 2) return numbers;
    if (numbers.startsWith("02")) {
      // 02-XXXX-XXXX 또는 02-XXX-XXXX
      if (numbers.length <= 5) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
      if (numbers.length <= 9) return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
    } else {
      // 031, 032 등 3자리 지역번호
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
      if (numbers.length <= 10) return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  }
};

export function BrokerRegisterSection() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL;

  const [name, setName] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const phoneError = useMemo(() => {
    if (!phone) return "";
    return PHONE_PATTERN.test(phone) ? "" : "올바른 전화번호 형식으로 입력해주세요.";
  }, [phone]);

  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setMessage("이미지 파일만 업로드 가능합니다.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("5MB 이하 파일만 업로드할 수 있어요.");
      return;
    }

    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${apiBaseUrl}/api/brokers/upload-photo`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage("사진 업로드에 실패했습니다.");
        setPhotoPreview(null);
        return;
      }
      setPhotoUrl(data.url);
    } catch {
      setMessage("사진 업로드 중 오류가 발생했습니다.");
      setPhotoPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handlePhotoUpload(file);
  };

  const clearPhoto = () => {
    setPhotoUrl(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRegister = async () => {
    if (!name.trim() || !officeName.trim() || !phone.trim()) {
      setMessage("모든 필수 항목을 입력해주세요.");
      return;
    }
    if (!PHONE_PATTERN.test(phone.trim())) {
      setMessage("올바른 전화번호 형식으로 입력해주세요.");
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
          photo_url: photoUrl ?? null,
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
            {/* 이름 */}
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

            {/* 중개사무소명 */}
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

            {/* 연락처 */}
            <div>
              <p className="mb-1 text-sm font-semibold text-stone-700">연락처 *</p>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="연락 가능한 번호를 입력해주세요"
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

            {/* 프로필 이미지 */}
            <div>
              <p className="mb-1 text-sm font-semibold text-stone-700">프로필 이미지</p>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !photoPreview && fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-6 transition-colors",
                  isDragging ? "border-stone-400 bg-stone-50" : "border-stone-200",
                  !photoPreview && "cursor-pointer hover:border-stone-300 hover:bg-stone-50"
                )}
              >
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="프로필 미리보기"
                      className="h-20 w-20 rounded-full object-cover border border-stone-200"
                    />
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                        <p className="text-xs text-white">업로드 중...</p>
                      </div>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); clearPhoto(); }}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-stone-800 text-white hover:bg-stone-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100">
                      <Upload className="h-5 w-5 text-stone-400" />
                    </div>
                    <p className="mt-2 text-sm font-medium text-stone-600">
                      클릭하거나 사진을 드래그하세요
                    </p>
                    <p className="text-xs text-stone-400">JPG, PNG, WEBP · 최대 5MB</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                }}
              />
            </div>

            {message && (
              <p className={cn("text-xs", message === "완료" ? "text-blue-500" : "text-red-500")}>
                {message === "완료" ? "중개사 인증이 완료되었습니다! 🎉" : message}
              </p>
            )}

            <button
              onClick={handleRegister}
              disabled={loading || uploading}
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