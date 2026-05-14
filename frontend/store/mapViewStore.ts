import { create } from "zustand";
import type { MapBounds } from "@/components/room-finder/map-view";

type MapViewState = {
  lastMapBounds: MapBounds | null;
  setLastMapBounds: (bounds: MapBounds) => void;
  clearLastMapBounds: () => void;
};

export const useMapViewStore = create<MapViewState>((set) => ({
  lastMapBounds: null,
  setLastMapBounds: (bounds) => set({ lastMapBounds: bounds }),
  clearLastMapBounds: () => set({ lastMapBounds: null }),
}));
