// src/stores/themeStore.ts
import { create } from "zustand";

export type Theme = "light" | "dark" | "system";

function resolveIsDark(theme: Theme): boolean {
  if (theme === "dark")  return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", resolveIsDark(theme));
}

// Restore persisted preference (default = dark)
const persisted = (localStorage.getItem("rms-theme") as Theme | null) ?? "dark";
applyTheme(persisted);

// Keep "system" mode in sync when OS preference changes
const mq = window.matchMedia("(prefers-color-scheme: dark)");
mq.addEventListener("change", () => {
  const stored = (localStorage.getItem("rms-theme") as Theme | null) ?? "dark";
  if (stored === "system") applyTheme("system");
});

interface ThemeStore {
  theme: Theme;
  isDark: boolean;
  setTheme: (t: Theme) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme:  persisted,
  isDark: resolveIsDark(persisted),

  setTheme(theme) {
    localStorage.setItem("rms-theme", theme);
    applyTheme(theme);
    set({ theme, isDark: resolveIsDark(theme) });
  },
}));
