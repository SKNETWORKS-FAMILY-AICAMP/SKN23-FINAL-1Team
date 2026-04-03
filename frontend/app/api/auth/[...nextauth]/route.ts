import NextAuth from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";
import NaverProvider from "next-auth/providers/naver";
import GoogleProvider from "next-auth/providers/google";

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
  callbacks: {
    async jwt({ token, user, profile }) {
      if (user) {
        token.id = user.id;
      }
      
      if (profile) {
        // 카카오 프로필 처리
        // @ts-ignore
        if (profile.kakao_account) {
          // @ts-ignore
          token.name = profile.kakao_account?.profile?.nickname || profile.properties?.nickname || user.name;
          // @ts-ignore
          token.image = profile.kakao_account?.profile?.profile_image_url || user.image;
        } 
        // 네이버 프로필 처리
        // @ts-ignore
        else if (profile.response) {
          // @ts-ignore
          token.name = profile.response.name || profile.response.nickname || user.name;
          // @ts-ignore
          token.image = profile.response.profile_image || user.image;
        }
        // 구글 프로필 처리 (기본 name, picture 사용)
        else {
          token.name = profile.name || user.name;
          // @ts-ignore
          token.image = profile.picture || user.image;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-ignore
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.image = token.image as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export { handler as GET, handler as POST };
