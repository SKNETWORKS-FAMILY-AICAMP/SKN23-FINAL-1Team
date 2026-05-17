import { withAuth } from "next-auth/middleware";

const proxy = withAuth({
  pages: {
    signIn: "/ko/login",
  },
});

export default proxy;

export const config = {
  matcher: ["/mypage/:path*", "/register", "/:locale/mypage/:path*", "/:locale/register"],
};
