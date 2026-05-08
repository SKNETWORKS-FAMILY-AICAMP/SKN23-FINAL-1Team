import { create } from "zustand";

export type AIScreen = "init" | "generated";

export type AIGeneratedImage = {
  id: string;
  url: string;
  prompt: string;
  promptHistory: string[];
  promptTimestamps?: string[];
  editCount: number;
};

export type AIImageGroup = {
  id: string;
  prompt: string;
  timestamp?: string;
  images: AIGeneratedImage[];
  selectedImageId?: string;
};

type AIImageSessionState = {
  hasHydrated: boolean;
  screen: AIScreen;
  generatedImages: AIGeneratedImage[];
  imageGroups: AIImageGroup[];
  selectedImageId: string | null;
  setHasHydrated: (value: boolean) => void;
  replaceSession: (images: AIGeneratedImage[]) => void;
  appendSession: (images: AIGeneratedImage[], sourceImageId?: string) => void;
  setSelectedImageId: (imageId: string | null) => void;
  resetSession: () => void;
};

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

function createImageGroup(images: AIGeneratedImage[]): AIImageGroup | null {
  if (images.length === 0) return null;

  const firstImage = images[0];
  const promptIndex = Math.max(0, firstImage.promptHistory.length - 1);
  const prompt = firstImage.promptHistory[promptIndex] ?? firstImage.prompt;
  const timestamp = firstImage.promptTimestamps?.[promptIndex];

  return {
    id: `${firstImage.id}-${promptIndex}`,
    prompt,
    timestamp,
    images,
  };
}

export const useAIImageSessionStore = create<AIImageSessionState>((set) => ({
  hasHydrated: true,
  screen: "init",
  generatedImages: [],
  imageGroups: [],
  selectedImageId: null,
  setHasHydrated: (value) => set({ hasHydrated: value }),
  replaceSession: (images) => {
    const group = createImageGroup(images);

    return set({
      screen: images.length > 0 ? "generated" : "init",
      generatedImages: images,
      imageGroups: group ? [group] : [],
      selectedImageId: null,
    });
  },
  appendSession: (images, sourceImageId) => {
    const group = createImageGroup(images);

    set((state) => ({
      screen: images.length > 0 ? "generated" : "init",
      generatedImages: images,
      imageGroups: group
        ? [
            ...state.imageGroups.map((existingGroup, index) =>
              index === state.imageGroups.length - 1 && sourceImageId
                ? { ...existingGroup, selectedImageId: sourceImageId }
                : existingGroup,
            ),
            group,
          ]
        : state.imageGroups,
      selectedImageId: null,
    }));
  },
  setSelectedImageId: (imageId) => set({ selectedImageId: imageId }),
  resetSession: () =>
    set({
      screen: "init",
      generatedImages: [],
      imageGroups: [],
      selectedImageId: null,
    }),
}));
