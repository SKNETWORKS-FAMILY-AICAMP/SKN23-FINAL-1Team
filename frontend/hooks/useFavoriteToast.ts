import { useCallback, useRef, useState } from "react";

export type FavoriteToastType = "add" | "remove";

export interface FavoriteToastState {
  message: string;
  type: FavoriteToastType;
}

export function useFavoriteToast(duration = 3000) {
  const [toast, setToast] = useState<FavoriteToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: FavoriteToastType) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type });
    timerRef.current = setTimeout(() => setToast(null), duration);
  }, [duration]);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, hideToast };
}
