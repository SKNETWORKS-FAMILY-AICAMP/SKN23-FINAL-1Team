import { create } from "zustand";

export type RecentListing = {
  id: string;
  title: string;
  price: string;
  address: string;
  images: string[];
  structure: string;
  size: string;
  floor: string;
  lat: number;
  lng: number;
};

type RecentState = {
  recentListings: RecentListing[];
  addRecent: (listing: RecentListing) => void;
  clearRecent: () => void;
};

export const useRecentStore = create<RecentState>((set) => ({
  recentListings: [],

  addRecent: (listing) =>
    set((state) => {
      // 중복 제거 — 같은 매물이면 맨 앞으로 이동
      const filtered = state.recentListings.filter((l) => l.id !== listing.id);
      // 최대 20개 유지
      return { recentListings: [listing, ...filtered].slice(0, 20) };
    }),

  clearRecent: () => set({ recentListings: [] }),
}));
