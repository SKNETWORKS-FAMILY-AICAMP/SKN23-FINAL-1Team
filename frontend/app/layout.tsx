import type { Metadata, Viewport } from "next";
import "./globals.css";
import NextAuthProvider from "@/components/common/NextAuthProvider";

export const metadata: Metadata = {
  title: "Room Project",
  description: "Room recommendation UI",
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
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}
