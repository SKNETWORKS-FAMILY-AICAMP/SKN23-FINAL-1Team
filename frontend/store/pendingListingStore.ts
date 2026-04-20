import { create } from "zustand";
import type { Listing } from "@/components/room-finder/map-view";

type PendingListingState = {
  pendingListing: Listing | null;
  setPendingListing: (listing: Listing) => void;
  clearPendingListing: () => void;
};

export const usePendingListingStore = create<PendingListingState>((set) => ({
  pendingListing: null,
  setPendingListing: (listing) => set({ pendingListing: listing }),
  clearPendingListing: () => set({ pendingListing: null }),
}));
