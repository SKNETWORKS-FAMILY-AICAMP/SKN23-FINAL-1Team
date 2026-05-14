"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/authStore";

export default function AuthSessionSync() {
  const { data: session, status } = useSession();
  const setUser = useAuthStore((state) => state.setUser);
  const updateUser = useAuthStore((state) => state.updateUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setUser({
        user_id: (session.user as any).user_id,
        email: session.user.email,
        nickname: (session.user as any).nickname,
        social_type: (session.user as any).social_type,
        provider_id: (session.user as any).provider_id,
        remain: (session.user as any).remain,
        credit: (session.user as any).credit,
        role: (session.user as any).role,
        image: session.user.image,
        backend_access_token: (session.user as any).backend_access_token,
        backend_refresh_token: (session.user as any).backend_refresh_token,
      });
    } else if (status === "unauthenticated") {
      clearUser();
    }
  }, [session, status, setUser, clearUser]);

  useEffect(() => {
    const userId = (session?.user as any)?.user_id;

    if (status !== "authenticated" || !userId) return;

    let ignore = false;

    const syncUserCredit = async () => {
      try {
        const response = await fetch(`/api/user-credit?user_id=${userId}`);
        const data = (await response.json().catch(() => null)) as
          | { credit?: number; remain?: number }
          | null;

        if (!response.ok || ignore || !data) return;

        updateUser({
          remain: data.remain,
          credit: data.credit,
        });
      } catch (error) {
        console.error("[AuthSessionSync] Failed to sync user credit:", error);
      }
    };

    syncUserCredit();

    return () => {
      ignore = true;
    };
  }, [session, status, updateUser]);

  return null;
}
