"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/authStore";

export default function AuthSessionSync() {
  const { data: session, status } = useSession();
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setUser({
        user_id: (session.user as any).user_id,
        email: session.user.email,
        nickname: (session.user as any).nickname,
        social_type: (session.user as any).social_type,
        provider_id: (session.user as any).provider_id,
        image: session.user.image,
        backend_access_token: (session.user as any).backend_access_token,
        backend_refresh_token: (session.user as any).backend_refresh_token,
      });
    } else if (status === "unauthenticated") {
      clearUser();
    }
  }, [session, status, setUser, clearUser]);

  return null;
}
