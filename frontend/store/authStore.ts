import { create } from "zustand";
import { useRecentStore } from "store/recentStore";

type AuthUser = {
  user_id?: number;
  email?: string | null;
  nickname?: string;
  social_type?: string;
  provider_id?: string;
  image?: string | null;
  backend_access_token?: string;
  backend_refresh_token?: string;
};

type AuthState = {
  user: AuthUser | null;
  isLoggedIn: boolean;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  setUser: (user) =>
    set({
      user,
      isLoggedIn: !!user,
    }),
  clearUser: () => {
    useRecentStore.getState().clearRecent();
    set({
      user: null,
      isLoggedIn: false,
    });
  },
}));
