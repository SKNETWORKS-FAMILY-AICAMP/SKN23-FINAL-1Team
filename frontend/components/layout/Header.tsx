"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-gray-200 bg-[#f1f0e4] py-4 shadow-sm">
      <div className="mx-auto flex h-16 w-full items-center justify-between px-4 sm:px-6 md:px-8 lg:px-10 xl:px-14">
        <div className="flex items-center gap-6 text-2xl font-semibold text-black sm:gap-8 sm:text-3xl md:text-4xl lg:gap-12 lg:text-5xl xl:gap-16">
          <button className="whitespace-nowrap transition hover:opacity-70 hover:text-white rounded-md px-2 py-1">
            원룸
          </button>
          <button className="whitespace-nowrap transition hover:opacity-70 hover:text-white rounded-md px-2 py-1 ">
            투룸
          </button>
        </div>

        <div className="flex items-center gap-4">
          {session ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 sm:text-base">
                {session.user?.name}님
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-300"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
            >
              로그인
            </Link>
          )}
          
          <button className="shrink-0 text-3xl font-light leading-none text-black transition hover:opacity-70 sm:text-4xl md:text-5xl lg:text-6xl">
            ↪
          </button>
        </div>
      </div>
    </header>
  );
}
