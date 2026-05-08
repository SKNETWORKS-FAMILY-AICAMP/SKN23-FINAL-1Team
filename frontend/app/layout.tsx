import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import NextAuthProvider from "@/components/common/NextAuthProvider";
import AuthSessionSync from "@/components/common/AuthSessionSync";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "방찾기 - AI 기반 원룸/투룸 매물 검색",
  description:
    "AI 이미지 생성으로 원하는 방 스타일을 검색하고 유사한 매물을 추천받으세요",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-neutral-100 text-black antialiased select-none">
        <NextAuthProvider>
          <AuthSessionSync />
          {children}
        </NextAuthProvider>
        <Toaster />
      </body>

      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false&libraries=services,clusterer,drawing`}
        strategy="afterInteractive"
      />
    </html>
  );
}