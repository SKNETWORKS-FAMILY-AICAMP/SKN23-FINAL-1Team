import type { Metadata, Viewport } from "next";
import "./globals.css";
import NextAuthProvider from "@/components/common/NextAuthProvider";
import AuthSessionSync from "@/components/common/AuthSessionSync";

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
      <body className="bg-neutral-100 text-black antialiased">
        <NextAuthProvider>
          <AuthSessionSync />
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}
