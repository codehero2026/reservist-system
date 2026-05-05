// src/components/layout/ThemeProvider.tsx
// Thin wrapper — actual logic lives in themeStore.ts (initialized at import time).
// This component exists so main.tsx has a clean mounting point.
import { useEffect } from "react";
import { useThemeStore } from "../../stores/themeStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();

  // Re-apply whenever the store changes (handles HMR edge case)
  useEffect(() => {
    const isDark =
      theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  }, [theme]);

  return <>{children}</>;
}
