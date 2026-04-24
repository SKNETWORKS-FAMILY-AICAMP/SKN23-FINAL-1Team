import { create } from "zustand";

interface OnboardingStore {
  isOpen: boolean;
  openGuide: () => void;
  closeGuide: () => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  isOpen: false,
  openGuide: () => set({ isOpen: true }),
  closeGuide: () => set({ isOpen: false }),
}));
