import NextAuth from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";
import NaverProvider from "next-auth/providers/naver";
import GoogleProvider from "next-auth/providers/google";
import { buildBackendApiUrl } from "@/lib/api/backend-url";

const BACKEND_URL = process.env.BACKEND_URL;

if (!BACKEND_URL) {
  console.warn("⚠️ 경고: BACKEND_URL 환경 변수가 설정되지 않았어! 통신 안 될걸?");
}

const handler = NextAuth({
  providers: [
    KakaoProvider({
      clientId: process.env.AUTH_KAKAO_ID || "",
      clientSecret: process.env.AUTH_KAKAO_SECRET || "",
    }),
    NaverProvider({
      clientId: process.env.AUTH_NAVER_ID || "",
      clientSecret: process.env.AUTH_NAVER_SECRET || "",
    }),
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (!account || !profile) return false;

        const socialType = account.provider;

        let providerId = "";
        let email: string | null = user.email ?? null;
        // let name: string | null = user.name ?? null;
        let image: string | null = user.image ?? null;

        if (socialType === "google") {
          providerId = String((profile as any).sub || "");
          // name = (profile as any).name || user.name || null;
          image = (profile as any).picture || user.image || null;
        } else if (socialType === "kakao") {
          providerId = String((profile as any).id || "");
          email = (profile as any)?.kakao_account?.email || user.email || null;
          // name =
          //   (profile as any)?.kakao_account?.profile?.nickname ||
          //   (profile as any)?.properties?.nickname ||
          //   user.name ||
          //   null;
          image =
            (profile as any)?.kakao_account?.profile?.profile_image_url ||
            user.image ||
            null;
        } else if (socialType === "naver") {
          providerId = String((profile as any)?.response?.id || "");
          email = (profile as any)?.response?.email || user.email || null;
          // name =[
          //   (profile as any)?.response?.name ||
          //   (profile as any)?.response?.nickname ||
          //   user.name ||
          //   null;]
          image =
            (profile as any)?.response?.profile_image || user.image || null;
        }

        if (!providerId) {
          throw new Error("provider_id 추출 실패");
        }

        const response = await fetch(buildBackendApiUrl(BACKEND_URL, "/auth/social-login"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            social_type: socialType,
            provider_id: providerId,
            email,
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          console.error("FastAPI social-login 실패:", text);
          return false;
        }

        const data = await response.json();

        (user as any).user_id = data.user.user_id;
        (user as any).nickname = data.user.nickname;
        (user as any).social_type = data.user.social_type;
        (user as any).provider_id = data.user.provider_id;
        (user as any).remain = data.user.remain;
        (user as any).credit = data.user.credit;
        (user as any).backend_access_token = data.access_token;
        (user as any).backend_refresh_token = data.refresh_token;
        (user as any).profile_image = image;

        return true;
      } catch (error) {
        console.error("signIn callback error:", error);
        return false;
      }
    },

    async jwt({ token, user, account, profile }) {
      if (account) {
        token.social_type = account.provider;
      }

      if (profile) {
        if ((profile as any).kakao_account) {
          token.name =
            (profile as any).kakao_account?.profile?.nickname ||
            (profile as any).properties?.nickname ||
            token.name;
          token.image =
            (profile as any).kakao_account?.profile?.profile_image_url ||
            token.image;
          token.provider_id = String((profile as any).id || "");
        } else if ((profile as any).response) {
          token.name =
            (profile as any).response?.name ||
            (profile as any).response?.nickname ||
            token.name;
          token.image = (profile as any).response?.profile_image || token.image;
          token.provider_id = String((profile as any).response?.id || "");
        } else {
          token.name = (profile as any).name || token.name;
          token.image = (profile as any).picture || token.image;
          token.provider_id = String((profile as any).sub || "");
        }
      }

      if (user) {
        token.user_id = (user as any).user_id;
        token.nickname = (user as any).nickname;
        token.social_type = (user as any).social_type;
        token.provider_id = (user as any).provider_id;
        token.remain = (user as any).remain;
        token.credit = (user as any).credit;
        token.backend_access_token = (user as any).backend_access_token;
        token.backend_refresh_token = (user as any).backend_refresh_token;
        token.image = (user as any).profile_image || token.image;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).user_id = token.user_id;
        (session.user as any).nickname = token.nickname;
        (session.user as any).social_type = token.social_type;
        (session.user as any).provider_id = token.provider_id;
        (session.user as any).remain = token.remain;
        (session.user as any).credit = token.credit;
        (session.user as any).backend_access_token = token.backend_access_token;
        (session.user as any).backend_refresh_token =
          token.backend_refresh_token;
        session.user.name = token.name as string;
        session.user.image = token.image as string;
        session.user.email = (token.email as string) || session.user.email;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
});

export { handler as GET, handler as POST };
