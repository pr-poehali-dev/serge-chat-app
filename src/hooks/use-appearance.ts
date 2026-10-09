import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "dark" | "light" | "system";
export type TextSize = "small" | "normal" | "large";

export interface Appearance {
  theme: ThemeMode;
  accent: string;
  textSize: TextSize;
}

export const ACCENTS: { id: string; label: string; from: string; to: string }[] = [
  { id: "violet", label: "Фиолетовый", from: "#a855f7", to: "#ec4899" },
  { id: "ocean", label: "Океан", from: "#38bdf8", to: "#6366f1" },
  { id: "mint", label: "Мята", from: "#34d399", to: "#38bdf8" },
  { id: "sunset", label: "Закат", from: "#f59e0b", to: "#ef4444" },
];

const STORAGE_KEY = "trindelka_appearance";
const DEFAULTS: Appearance = { theme: "dark", accent: "violet", textSize: "normal" };
const TEXT_SCALE: Record<TextSize, string> = { small: "14px", normal: "16px", large: "18px" };

function read(): Appearance {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Appearance>;
    return {
      theme: parsed.theme === "light" || parsed.theme === "system" ? parsed.theme : "dark",
      accent: ACCENTS.some((a) => a.id === parsed.accent) ? (parsed.accent as string) : DEFAULTS.accent,
      textSize: parsed.textSize === "small" || parsed.textSize === "large" ? parsed.textSize : "normal",
    };
  } catch {
    return DEFAULTS;
  }
}

function resolveTheme(mode: ThemeMode): "dark" | "light" {
  if (mode !== "system") return mode;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyAppearance(a: Appearance) {
  const root = document.documentElement;
  const resolved = resolveTheme(a.theme);
  root.classList.toggle("light", resolved === "light");
  root.classList.toggle("dark", resolved === "dark");
  const accent = ACCENTS.find((x) => x.id === a.accent) || ACCENTS[0];
  root.style.setProperty("--neon-purple", accent.from);
  root.style.setProperty("--neon-pink", accent.to);
  root.style.fontSize = TEXT_SCALE[a.textSize];
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", resolved === "light" ? "#f4f4f9" : "#0d0d14");
}

export function initAppearance() {
  applyAppearance(read());
}

export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(read);

  useEffect(() => {
    applyAppearance(appearance);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
    } catch {
      return;
    }
  }, [appearance]);

  useEffect(() => {
    if (appearance.theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyAppearance(appearance);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [appearance]);

  const update = useCallback((patch: Partial<Appearance>) => {
    setAppearance((prev) => ({ ...prev, ...patch }));
  }, []);

  return { appearance, update };
}
