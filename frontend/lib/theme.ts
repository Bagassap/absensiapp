"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "theme";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

export function useTheme() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const setDark = useCallback((dark: boolean) => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(KEY, dark ? "dark" : "light");
    } catch {}
    listeners.forEach((l) => l());
  }, []);

  const toggle = useCallback(() => setDark(!getSnapshot()), [setDark]);

  return { isDark, toggle, setDark };
}
