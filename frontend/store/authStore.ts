import { create } from "zustand";
import { useRecentStore } from "store/recentStore";
import { useAIImageSessionStore } from "@/store/aiImageSessionStore";

type AuthUser = {
  user_id?: number;
  email?: string | null;
  nickname?: string;
  social_type?: string;
  provider_id?: string;
  remain?: number;
  credit?: number;
  image?: string | null;
  backend_access_token?: string;
  backend_refresh_token?: string;
};

type AuthState = {
  user: AuthUser | null;
  isLoggedIn: boolean;
  setUser: (user: AuthUser | null) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
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
  updateUser: (patch) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...patch } : state.user,
    })),
  clearUser: () => {
    useRecentStore.getState().clearRecent();
    useAIImageSessionStore.getState().resetSession();
    set({
      user: null,
      isLoggedIn: false,
    });
  },
}));
