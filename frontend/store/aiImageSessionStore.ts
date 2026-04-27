import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AIScreen = "init" | "generated";

export type AIGeneratedImage = {
  id: string;
  url: string;
  prompt: string;
  promptHistory: string[];
  editCount: number;
};

type AIImageSessionState = {
  hasHydrated: boolean;
  screen: AIScreen;
  generatedImages: AIGeneratedImage[];
  selectedImageId: string | null;
  setHasHydrated: (value: boolean) => void;
  replaceSession: (images: AIGeneratedImage[]) => void;
  setSelectedImageId: (imageId: string | null) => void;
  resetSession: () => void;
};

export const MAX_AI_EDIT_COUNT = 2;

export function composePromptHistory(promptHistory: string[]) {
  return promptHistory
    .map((prompt, index) =>
      index === 0
        ? prompt.trim()
        : `Additional edit request ${index}: ${prompt.trim()}`,
    )
    .filter(Boolean)
    .join("\n");
}

export const useAIImageSessionStore = create<AIImageSessionState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      screen: "init",
      generatedImages: [],
      selectedImageId: null,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      replaceSession: (images) =>
        set({
          screen: images.length > 0 ? "generated" : "init",
          generatedImages: images,
          selectedImageId: null,
        }),
      setSelectedImageId: (imageId) => set({ selectedImageId: imageId }),
      resetSession: () =>
        set({
          screen: "init",
          generatedImages: [],
          selectedImageId: null,
        }),
    }),
    {
      name: "ai-image-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        screen: state.screen,
        generatedImages: state.generatedImages,
        selectedImageId: state.selectedImageId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
