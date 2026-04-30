import { withAuth } from "next-auth/middleware";

const proxy = withAuth({
  pages: {
    signIn: "/login",
  },
});

export default proxy;

export const config = {
  matcher: ["/mypage/:path*"],
};
