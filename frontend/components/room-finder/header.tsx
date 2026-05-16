"use client";

import LogoutButton from "@/components/common/LogoutButton";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import Image from "next/image";
import { CheckCircle2, CreditCard, Loader2, Plus } from "lucide-react";
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
  payMethod: "CARD" | "EASY_PAY";
  customer?: {
    customerId?: string;
    fullName?: string;
    phoneNumber?: string;
    email?: string | null;
  };
};

type PortOnePaymentResponse = {
  code?: string;
  message?: string;
  paymentId?: string;
};

type IamportPaymentRequest = {
  pg?: string;
  channelKey: string;
  pay_method: "card" | "phone";
  merchant_uid: string;
  name: string;
  amount: number;
  buyer_email: string;
  buyer_name?: string;
  buyer_tel: string;
  company?: string;
};

type IamportPaymentResponse = {
  success: boolean;
  imp_uid?: string;
  merchant_uid?: string;
  error_msg?: string;
} | null;

declare global {
  interface Window {
    PortOne?: {
      requestPayment: (
        request: PortOnePaymentRequest,
      ) => Promise<PortOnePaymentResponse | undefined>;
    };
    IMP?: {
      init: (merchantCode: string) => void;
      request_pay: (
        request: IamportPaymentRequest,
        callback: (response: IamportPaymentResponse) => void,
      ) => void;
    };
  }
}

const navButtonBase =
  "shrink-0 cursor-pointer whitespace-nowrap px-1 py-2 text-sm font-medium tracking-tight text-stone-500 transition-all duration-200 hover:text-stone-900 active:text-base active:font-bold sm:px-2 md:text-[15px] md:active:text-[17px]";
const navButtonActive = "text-base font-bold text-stone-900 md:text-[17px]";
const navButtonInactive = "text-stone-500";
const creditProducts = [
  {
    productId: "credit_2",
    label: "\ud06c\ub808\ub527 2\uac1c",
    price: "500\uc6d0",
    unitPrice: "1\uac1c\ub2f9 250\uc6d0",
  },
  {
    productId: "credit_5",
    label: "\ud06c\ub808\ub527 5\uac1c",
    price: "1,000\uc6d0",
    unitPrice: "1\uac1c\ub2f9 200\uc6d0",
    recommended: true,
  },
  {
    productId: "credit_10",
    label: "\ud06c\ub808\ub527 10\uac1c",
    price: "1,500\uc6d0",
    unitPrice: "1\uac1c\ub2f9 150\uc6d0",
    bestValue: true,
  },
];
const paymentChannels = [
  {
    id: "kakaopay",
    label: "\uce74\uce74\uc624\ud398\uc774",
    sdk: "v2",
    channelKey:
      process.env.NEXT_PUBLIC_PORTONE_KAKAOPAY_CHANNEL_KEY ??
      process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,
    payMethod: "EASY_PAY",
  },
  {
    id: "tosspay",
    label: "\ud1a0\uc2a4\ud398\uc774",
    sdk: "v1",
    channelKey: process.env.NEXT_PUBLIC_PORTONE_TOSSPAY_CHANNEL_KEY,
    payMethod: "card",
  },
  {
    id: "inicis",
    label: "KG\uc774\ub2c8\uc2dc\uc2a4",
    sdk: "v2",
    channelKey: process.env.NEXT_PUBLIC_PORTONE_INICIS_CHANNEL_KEY,
    payMethod: "CARD",
  },
  {
    id: "danal",
    label: "\ub2e4\ub0a0",
    sdk: "v1",
    channelKey: process.env.NEXT_PUBLIC_PORTONE_DANAL_CHANNEL_KEY,
    payMethod: "card",
  },
] as const;

export function Header({ roomType, onRoomTypeChange }: HeaderProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const updateUser = useAuthStore((state) => state.updateUser);
  const openGuide = useOnboardingStore((state) => state.openGuide);
  const [isChargingCredit, setIsChargingCredit] = useState(false);
  const [isCreditMenuOpen, setIsCreditMenuOpen] = useState(false);
  const [creditMessage, setCreditMessage] = useState<string | null>(null);
  const [isPortOneReady, setIsPortOneReady] = useState(false);
  const [isIamportReady, setIsIamportReady] = useState(false);
  const [selectedPaymentChannelId, setSelectedPaymentChannelId] =
    useState<(typeof paymentChannels)[number]["id"]>("kakaopay");
  const selectedPaymentChannelForMenu =
    paymentChannels.find((channel) => channel.id === selectedPaymentChannelId) ??
    paymentChannels[0];

  const completePreparedPayment = async (
    paymentId: string,
    providerTransactionId?: string,
  ) => {
    if (!user?.user_id) {
      throw new Error("User is not logged in.");
    }

    const response = await fetch("/api/payments/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.user_id,
        payment_id: paymentId,
        provider_transaction_id: providerTransactionId,
      }),
    });
    const data = (await response.json().catch(() => null)) as
      | {
          credit?: number;
          remain?: number;
          charged_credit?: number;
          status?: string;
          error?: string;
        }
      | null;

    if (!response.ok) {
      throw new Error(data?.error ?? "Failed to complete payment.");
    }

    updateUser({
      credit: data?.credit ?? user.credit,
      remain: data?.remain ?? user.remain,
    });

    return data;
  };

  const handlePreparePayment = async (productId: string) => {
    if (!user?.user_id || isChargingCredit) return;

    const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
    const iamportMerchantCode =
      process.env.NEXT_PUBLIC_IAMPORT_MERCHANT_CODE ?? storeId;
    const selectedPaymentChannel =
      paymentChannels.find((channel) => channel.id === selectedPaymentChannelId) ??
      paymentChannels[0];

    if ("disabled" in selectedPaymentChannel && selectedPaymentChannel.disabled) {
      setCreditMessage("Danal payment is disabled for safety.");
      return;
    }

    const selectedChannelKey = selectedPaymentChannel.channelKey;

    if (!storeId || !selectedChannelKey) {
      setCreditMessage("PortOne test config is missing.");
      return;
    }

    if (
      selectedPaymentChannel.sdk === "v2" &&
      (!window.PortOne || !isPortOneReady)
    ) {
      setCreditMessage("PortOne V2 SDK is loading.");
      return;
    }

    if (
      selectedPaymentChannel.sdk === "v1" &&
      (!window.IMP || !isIamportReady)
    ) {
      setCreditMessage("PortOne V1 SDK is loading.");
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
          payment_sdk: selectedPaymentChannel.sdk.toUpperCase(),
          payment_channel: selectedPaymentChannel.id,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            payment_id?: string;
            item_name?: string;
            amount?: number;
            credit_amount?: number;
            payment_sdk?: string | null;
            payment_channel?: string | null;
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

      const paymentId = data.payment_id;
      const itemName = data.item_name;
      const amount = data.amount;

      if (selectedPaymentChannel.sdk === "v1") {
        if (!iamportMerchantCode || !iamportMerchantCode.startsWith("imp")) {
          throw new Error("PortOne V1 merchant code must start with imp.");
        }

        window.IMP?.init(iamportMerchantCode);

        const payment = await new Promise<IamportPaymentResponse>((resolve) => {
          window.IMP?.request_pay(
            {
              pg: selectedPaymentChannel.id === "danal" ? "danal" : undefined,
              channelKey: selectedChannelKey,
              pay_method: selectedPaymentChannel.payMethod,
              merchant_uid: paymentId,
              name: itemName,
              amount,
              buyer_email: user.email ?? `test-user-${user.user_id}@example.com`,
              buyer_name: user.nickname,
              buyer_tel: "010-1234-5678",
              company: "Geumbang",
            },
            resolve,
          );
        });

        if (!payment) {
          throw new Error("Payment window returned no response.");
        }

        if (payment.error_msg || payment.success === false) {
          throw new Error(payment.error_msg ?? "Payment was canceled or failed.");
        }

        const completedPayment = await completePreparedPayment(
          paymentId,
          payment.imp_uid,
        );

        setCreditMessage(
          `PAID: ${completedPayment?.charged_credit ?? 0} credits`,
        );
        setIsCreditMenuOpen(false);
        console.log("[payment completed]", {
          order: data,
          payment,
          completedPayment,
        });
        return;
      }

      const payment = await window.PortOne?.requestPayment({
        storeId,
        channelKey: selectedChannelKey,
        paymentId,
        orderName: itemName,
        totalAmount: amount,
        currency: "CURRENCY_KRW",
        payMethod: selectedPaymentChannel.payMethod,
        customer: {
          customerId: String(user.user_id),
          fullName: user.nickname,
          phoneNumber: "010-1234-5678",
          email: user.email ?? `test-user-${user.user_id}@example.com`,
        },
      });

      if (payment?.code) {
        throw new Error(payment.message ?? "Payment was canceled or failed.");
      }

      const completedPayment = await completePreparedPayment(
        paymentId,
        payment?.paymentId,
      );

      setCreditMessage(`PAID: ${completedPayment?.charged_credit ?? 0} credits`);
      setIsCreditMenuOpen(false);
      console.log("[payment completed]", {
        order: data,
        payment,
        completedPayment,
      });
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
        onReady={() => setIsPortOneReady(true)}
      />
      <Script
        src="https://cdn.iamport.kr/v1/iamport.js"
        strategy="afterInteractive"
        onLoad={() => setIsIamportReady(true)}
        onReady={() => setIsIamportReady(true)}
      />
      <header className="relative z-[99] border-b border-stone-200/80 bg-white/70 backdrop-blur-xl">
        <div className="flex min-h-12 flex-wrap items-center gap-y-2 py-2 md:h-12 md:flex-nowrap md:py-0">
        <div className="flex h-full w-24 shrink-0 items-center justify-center border-stone-200/80 px-3 sm:w-36 md:w-56 md:px-6">
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

        <div className="order-3 flex min-w-0 flex-1 basis-full items-center gap-3 overflow-x-auto px-4 scrollbar-hide sm:gap-5 md:order-none md:basis-auto md:gap-7 md:px-6">
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
          <div className="flex min-w-0 flex-1 shrink items-center justify-end gap-1.5 overflow-visible px-2 sm:gap-2 sm:px-3 md:w-auto md:flex-none md:px-6">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCreditMenuOpen((isOpen) => !isOpen)}
                disabled={isChargingCredit}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-stone-900 bg-stone-950 px-2.5 py-1.5 text-[11px] font-bold tracking-tight text-white shadow-sm transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
                aria-label="크레딧 충전"
              >
                <span className="sm:hidden">충전</span>
                <span className="hidden sm:inline">크레딧 충전</span>
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-stone-950">
                  <Plus className="h-3 w-3" />
                </span>
              </button>
              {isCreditMenuOpen && (
                <div className="fixed left-3 right-3 top-16 z-[200] max-h-[calc(100vh-5rem)] overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-2xl shadow-stone-900/15 sm:absolute sm:left-auto sm:right-0 sm:top-9 sm:w-[320px] sm:max-h-none sm:overflow-hidden">
                  <div className="space-y-3 p-4">
                    <section>
                      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-stone-700">
                        <CreditCard className="h-3.5 w-3.5" />
                        결제수단
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                    {paymentChannels.map((channel) => (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => {
                          setSelectedPaymentChannelId(channel.id);
                          setCreditMessage(null);
                        }}
                        disabled={
                          !channel.channelKey ||
                          isChargingCredit ||
                          ("disabled" in channel && channel.disabled === true)
                        }
                        className={cn(
                          "flex h-9 items-center justify-center rounded-md border px-2 text-[11px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                          selectedPaymentChannelId === channel.id
                            ? "border-stone-950 bg-stone-950 text-white"
                            : "border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50",
                        )}
                      >
                        {channel.label}
                      </button>
                    ))}
                      </div>
                    </section>

                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] font-bold text-stone-700">
                          충전 상품
                        </p>
                        <p className="text-[10px] font-semibold text-stone-500">
                          {selectedPaymentChannelForMenu.label}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        {creditProducts.map((product) => (
                          <button
                            key={product.productId}
                            type="button"
                            onClick={() => handlePreparePayment(product.productId)}
                            disabled={isChargingCredit}
                            className="group flex w-full items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-stone-900 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
                                <Image
                                  src="/coin.png"
                                  alt="크레딧"
                                  width={32}
                                  height={32}
                                  className="h-full w-full object-cover"
                                />
                              </span>
                              <span className="min-w-0">
                                <span className="flex items-center gap-1.5 text-[13px] font-bold text-stone-900">
                                  {product.label}
                                  {product.recommended && (
                                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                                      추천
                                    </span>
                                  )}
                                  {product.bestValue && (
                                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                                      혜택
                                    </span>
                                  )}
                                </span>
                                <span className="mt-0.5 block text-[10px] font-semibold text-stone-500">
                                  {product.unitPrice}
                                </span>
                              </span>
                            </span>
                            <span className="text-right">
                              <span className="block text-[13px] font-black text-stone-950">
                                {product.price}
                              </span>
                              <span className="text-[10px] font-semibold text-stone-500">
                                결제하기
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>

                    <div className="rounded-md bg-stone-50 px-3 py-2 text-[10px] font-medium leading-4 text-stone-500">
                      테스트 결제용 충전입니다. 결제 완료 후 서버 검증을 거쳐 크레딧이 반영됩니다.
                    </div>

                    {isChargingCredit && (
                      <div className="flex items-center gap-2 rounded-md bg-stone-950 px-3 py-2 text-[11px] font-bold text-white">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        결제창을 준비하고 있습니다
                      </div>
                    )}

                    {creditMessage && !isChargingCredit && (
                      <div className="flex items-start gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-[10px] font-semibold leading-4 text-stone-600">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span className="break-all">{creditMessage}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold tracking-tight text-amber-800 shadow-sm">
              <Image
                src="/coin.png"
                alt="크레딧"
                width={16}
                height={16}
                className="h-4 w-4 object-cover"
              />
              {user.credit ?? 0}개
            </div>
            <div className="flex items-center gap-1.5">
              {user.role === "BROKER" && (
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="9" fill="#2563EB"/>
                  <path d="M5 9l2.5 2.5L13 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              <span className="max-w-16 truncate text-[12px] font-semibold tracking-tight text-stone-800 sm:max-w-24 sm:text-sm">
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
