"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import Logo from "@/assets/Logo.png";

export default function LoginForm() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-[#FFFFF0] font-sans">
      
      {/* 중앙 콘텐츠 영역 */}
      <main className="flex w-full flex-grow flex-col items-center justify-center px-4 py-12 sm:px-6">
        
        {/* 메인 로그인 카드 */}
        <div className="w-full max-w-md rounded-[2rem] sm:rounded-[2.5rem] bg-[#FAF0E6] p-8 sm:p-12 shadow-[0_20px_50px_rgba(210,180,140,0.15)] border border-[#F5F5DC]">
          
          <div className="flex flex-col items-center text-center">
            {/* 로고 */}
            <div className="relative mb-2 w-60 h-36 sm:w-72 sm:h-44 drop-shadow-md">
              <Image
                src={Logo}
                alt="금방 로고"
                fill
                style={{ objectFit: "contain" }}
                priority
              />
            </div>
            <div className="h-[1px] w-12 bg-[#F5F5DC] mb-6"></div>
          </div>

          <div className="space-y-8">
            <div className="text-center space-y-2">
              <p className="text-[#8B7355] text-xs sm:text-sm font-medium tracking-wide">
                스마트한 자취 생활의 시작
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-[#5D4037]">
                방을 찾는 가장 금방인 방법
              </h1>
            </div>

            <div className="space-y-3">
              {/* 카카오 로그인 */}
              <button
                onClick={() => signIn("kakao", { callbackUrl: "/home" })}
                className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-[#FEE500] px-6 py-4 text-sm sm:text-base font-bold text-[#3c1e1e] transition-all hover:bg-[#FADA0A] hover:shadow-lg active:scale-[0.98]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C6.47715 3 2 6.47715 2 10.7588C2 13.5139 3.82139 15.9332 6.57321 17.3402L5.80806 20.147C5.74818 20.3667 5.86745 20.597 6.08271 20.6756C6.15555 20.7022 6.2341 20.7075 6.30939 20.6905L10.0434 19.8631C10.6811 19.9822 11.3341 20.0456 12 20.0456C17.5228 20.0456 22 16.5685 22 12.2868C22 8.00511 17.5228 4.52802 12 4.52802" />
                </svg>
                카카오로 시작하기
              </button>

              {/* 네이버 로그인 */}
              <button
                onClick={() => signIn("naver", { callbackUrl: "/home" })}
                className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-[#03C75A] px-6 py-4 text-sm sm:text-base font-bold text-white transition-all hover:bg-[#02b350] hover:shadow-lg active:scale-[0.98]"
              >
                <span className="text-lg sm:text-xl font-black leading-none">N</span>
                네이버로 시작하기
              </button>

              {/* 구글 로그인 */}
              <button
                onClick={() => signIn("google", { callbackUrl: "/home" })}
                className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-sm sm:text-base font-bold text-gray-700 border border-gray-200 transition-all hover:bg-gray-50 hover:shadow-lg active:scale-[0.98]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google로 시작하기
              </button>
            </div>
            
            <div className="flex justify-center gap-6 text-[10px] sm:text-xs text-[#A89078] font-medium pt-2">
              <span className="cursor-pointer hover:text-[#5D4037]">이용약관</span>
              <span className="cursor-pointer hover:text-[#5D4037]">개인정보 처리방침</span>
              <span className="cursor-pointer hover:text-[#5D4037]">고객센터</span>
            </div>
          </div>
        </div>
      </main>

      {/* 푸터 영역 */}
      <footer className="w-full py-8 text-center text-xs sm:text-sm text-[#BC8F8F] font-light tracking-wider">
        © 2026 GEUMBANG. All rights reserved.
      </footer>
    </div>
  );
}
