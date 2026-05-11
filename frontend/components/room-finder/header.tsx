"use client";

import LogoutButton from "@/components/common/LogoutButton";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useState } from "react";
import Logo from "@/assets/Logo.png";
import { useOnboardingStore } from "@/store/onboardingStore";

interface HeaderProps {
  roomType: "oneroom" | "tworoom";
  onRoomTypeChange: (type: "oneroom" | "tworoom") => void;
}

type PortOnePaymentRequest = {
  storeId: string;
  channelKey: string;
  paymentId: string;
  orderName: string;
  totalAmount: number;
  currency: "CURRENCY_KRW";
  payMethod: "CARD";
  customer?: {
    customerId?: string;
    fullName?: string;
    email?: string | null;
  };
};

type PortOnePaymentResponse = {
  code?: string;
  message?: string;
  paymentId?: string;
};

declare global {
  interface Window {
    PortOne?: {
      requestPayment: (
        request: PortOnePaymentRequest,
      ) => Promise<PortOnePaymentResponse | undefined>;
    };
  }
}

const navButtonBase =
  "shrink-0 cursor-pointer whitespace-nowrap px-1 py-2 text-sm font-medium tracking-tight text-stone-500 transition-all duration-200 hover:text-stone-900 active:text-base active:font-bold sm:px-2 md:text-[15px] md:active:text-[17px]";
const navButtonActive = "text-base font-bold text-stone-900 md:text-[17px]";
const navButtonInactive = "text-stone-500";
const creditProducts = [
  { productId: "credit_2", label: "\ud06c\ub808\ub527 2\uac1c", price: "500\uc6d0" },
  { productId: "credit_5", label: "\ud06c\ub808\ub527 5\uac1c", price: "1,000\uc6d0" },
  { productId: "credit_10", label: "\ud06c\ub808\ub527 10\uac1c", price: "1,500\uc6d0" },
];

export function Header({ roomType, onRoomTypeChange }: HeaderProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const openGuide = useOnboardingStore((state) => state.openGuide);
  const [isChargingCredit, setIsChargingCredit] = useState(false);
  const [isCreditMenuOpen, setIsCreditMenuOpen] = useState(false);
  const [creditMessage, setCreditMessage] = useState<string | null>(null);
  const [isPortOneReady, setIsPortOneReady] = useState(false);

  const handlePreparePayment = async (productId: string) => {
    if (!user?.user_id || isChargingCredit) return;

    const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
    const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;

    if (!storeId || !channelKey) {
      setCreditMessage("PortOne test config is missing.");
      return;
    }

    if (!window.PortOne || !isPortOneReady) {
      setCreditMessage("PortOne SDK is loading.");
      return;
    }

    setIsChargingCredit(true);
    setCreditMessage(null);

    try {
      const response = await fetch("/api/payments/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.user_id,
          product_id: productId,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            payment_id?: string;
            item_name?: string;
            amount?: number;
            credit_amount?: number;
            status?: string;
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to prepare payment.");
      }

      if (!data?.payment_id || !data.item_name || !data.amount) {
        throw new Error("Invalid payment prepare response.");
      }

      const payment = await window.PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId: data.payment_id,
        orderName: data.item_name,
        totalAmount: data.amount,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        customer: {
          customerId: String(user.user_id),
          fullName: user.nickname,
          email: user.email,
        },
      });

      if (payment?.code) {
        throw new Error(payment.message ?? "Payment was canceled or failed.");
      }

      setCreditMessage(`PAYMENT_RETURNED: ${data.payment_id}`);
      setIsCreditMenuOpen(false);
      console.log("[payment returned]", { order: data, payment });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to request payment.";
      setCreditMessage(message);
      console.error("[header] payment request failed:", error);
    } finally {
      setIsChargingCredit(false);
    }
  };

  return (
    <>
      <Script
        src="https://cdn.portone.io/v2/browser-sdk.js"
        strategy="afterInteractive"
        onLoad={() => setIsPortOneReady(true)}
      />
      <header className="relative z-[1000] border-b border-stone-200/80 bg-white/70 backdrop-blur-xl">
        <div className="flex h-12 items-center">
        <div className="flex h-full w-28 shrink-0 items-center justify-center border-stone-200/80 px-3 sm:w-40 md:w-56 md:px-6">
          <button
            type="button"
            onClick={() => {
              onRoomTypeChange("oneroom");
              window.location.reload();
            }}
            className="flex cursor-pointer items-center"
            aria-label="홈으로 이동"
          >
            <Image
              src={Logo}
              alt="로고"
              width={120}
              height={40}
              className="object-contain"
            />
          </button>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto px-4 scrollbar-hide sm:gap-5 md:gap-7 md:px-6">
          <button
            onClick={() => onRoomTypeChange("oneroom")}
            className={cn(
              navButtonBase,
              roomType === "oneroom" ? navButtonActive : navButtonInactive,
            )}
          >
            원룸
          </button>

          <button
            onClick={() => onRoomTypeChange("tworoom")}
            className={cn(
              navButtonBase,
              roomType === "tworoom" ? navButtonActive : navButtonInactive,
            )}
          >
            투룸
          </button>

          {isLoggedIn && user && (
            <button
              onClick={() => router.push("/mypage")}
              className={cn(navButtonBase, navButtonInactive)}
            >
              마이페이지
            </button>
          )}

          {user?.role === "BROKER" && (
            <button
              onClick={() => router.push("/register")}
              className={cn(navButtonBase, navButtonInactive)}
            >
              매물등록
            </button>
          )}
        </div>

        {isLoggedIn && user ? (
          <div className="flex w-auto shrink-0 items-center justify-end gap-1.5 px-3 sm:gap-2 md:px-6">
            <div className="relative">
              <button
                onClick={() => setIsCreditMenuOpen((isOpen) => !isOpen)}
                disabled={isChargingCredit}
                className="rounded-md border border-stone-300 px-2 py-1 text-[11px] font-semibold tracking-tight text-stone-700 transition-colors hover:border-stone-500 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                credit+
              </button>
              {isCreditMenuOpen && (
                <div className="absolute right-0 top-8 z-[1001] w-44 rounded-md border border-stone-200 bg-white p-2 shadow-lg">
                  {creditProducts.map((product) => (
                    <button
                      key={product.productId}
                      type="button"
                      onClick={() => handlePreparePayment(product.productId)}
                      disabled={isChargingCredit}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[12px] font-semibold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>{product.label}</span>
                      <span>{product.price}</span>
                    </button>
                  ))}
                  {creditMessage && (
                    <p className="mt-1 break-all px-2 text-[10px] leading-4 text-stone-500">
                      {creditMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="rounded-md bg-stone-100 px-2 py-1 text-[11px] font-semibold tracking-tight text-stone-700">
              {user.credit ?? 0}
            </div>
            <div className="flex items-center gap-1.5">
              {user.role === "BROKER" && (
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="9" fill="#2563EB"/>
                  <path d="M5 9l2.5 2.5L13 6" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              )}
              <span className="text-[12px] font-semibold tracking-tight text-stone-800 sm:text-sm">
                {user.nickname}
              </span>
            </div>
            <div className="h-4 w-px bg-stone-200 sm:h-5" />
            <button
              onClick={openGuide}
              className="hidden shrink-0 cursor-pointer text-[12px] font-semibold tracking-tight text-stone-500 transition-all duration-200 hover:text-stone-900 sm:text-sm lg:block"
            >
              도움말
            </button>
            <div className="hidden h-4 w-px bg-stone-200 sm:h-5 lg:block" />
            <LogoutButton />
          </div>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="mr-3 shrink-0 cursor-pointer px-2.5 py-2 text-[12px] font-semibold tracking-tight text-stone-800 transition-all duration-200 hover:text-stone-500 sm:mr-4 sm:px-4 sm:text-sm md:mr-6"
          >
            로그인
          </button>
        )}
        </div>
      </header>
    </>
  );
}
