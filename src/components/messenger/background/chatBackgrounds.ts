export interface BgPreset {
  id: string;
  title: string;
  css: string;
  size?: string;
  light?: boolean;
}

export const BG_PRESETS: BgPreset[] = [
  { id: "aurora", title: "Северное сияние", css: "radial-gradient(60% 50% at 20% 10%, rgba(168,85,247,0.55), transparent 70%), radial-gradient(55% 45% at 85% 25%, rgba(56,189,248,0.45), transparent 70%), radial-gradient(60% 50% at 50% 100%, rgba(236,72,153,0.4), transparent 70%), #0f0a24" },
  { id: "sunset", title: "Закат", css: "linear-gradient(160deg, #3b0764 0%, #be185d 55%, #f59e0b 100%)" },
  { id: "ocean", title: "Океан", css: "linear-gradient(170deg, #022c43 0%, #0369a1 55%, #22d3ee 120%)" },
  { id: "forest", title: "Лес", css: "radial-gradient(70% 55% at 80% 0%, rgba(52,211,153,0.35), transparent 70%), linear-gradient(180deg, #052e2b 0%, #0b3d2e 100%)" },
  { id: "midnight", title: "Полночь", css: "radial-gradient(80% 60% at 50% 0%, #1e1b4b 0%, #0b0b1a 70%)" },
  { id: "peach", title: "Персик", css: "linear-gradient(160deg, #fde7d9 0%, #fbcfe8 60%, #e9d5ff 100%)", light: true },
  { id: "mint", title: "Мята", css: "linear-gradient(160deg, #d1fae5 0%, #cffafe 60%, #e0e7ff 100%)", light: true },
  { id: "lavender", title: "Лаванда", css: "linear-gradient(160deg, #ede9fe 0%, #f5d0fe 100%)", light: true },
  { id: "dots", title: "Точки", css: "radial-gradient(rgba(168,85,247,0.35) 1.4px, transparent 1.6px), #14102b", size: "22px 22px" },
  { id: "grid", title: "Сетка", css: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), #101024", size: "28px 28px" },
  { id: "waves", title: "Волны", css: "repeating-radial-gradient(circle at 0 120%, rgba(56,189,248,0.18) 0 14px, transparent 14px 28px), linear-gradient(180deg, #0c1a3a, #121a4a)" },
  { id: "carbon", title: "Графит", css: "linear-gradient(135deg, #1f1f23 25%, #26262b 25%, #26262b 50%, #1f1f23 50%, #1f1f23 75%, #26262b 75%)", size: "16px 16px" },
  { id: "candy", title: "Конфета", css: "conic-gradient(from 210deg at 30% 20%, #f472b6, #a78bfa, #38bdf8, #34d399, #f472b6)" },
  { id: "rose", title: "Роза", css: "radial-gradient(70% 60% at 15% 15%, rgba(251,113,133,0.55), transparent 70%), linear-gradient(200deg, #4c0519, #881337)" },
];

export const BG_COLORS = ["#0d0d14", "#1e1b4b", "#312e81", "#164e63", "#14532d", "#7f1d1d", "#831843", "#451a03", "#f6f6fb", "#fde68a"];

export interface ResolvedBg {
  style: Record<string, string>;
  vars: Record<string, string>;
  light: boolean;
  scrim: boolean;
}

const LIGHT_VARS: Record<string, string> = {
  "--fg": "24 20 48",
  "--fg-gain": "1.6",
  "--bubble-in-bg": "rgba(255, 255, 255, 0.95)",
  "--bubble-in-border": "rgba(24, 20, 48, 0.1)",
};

const DARK_VARS: Record<string, string> = {
  "--fg": "255 255 255",
  "--fg-gain": "1",
  "--bubble-in-bg": "rgba(20, 16, 40, 0.78)",
  "--bubble-in-border": "rgba(255, 255, 255, 0.1)",
};

const varsFor = (light: boolean) => (light ? LIGHT_VARS : DARK_VARS);

const hexLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
};

export function resolveBg(bg: string | null | undefined): ResolvedBg | null {
  if (!bg) return null;
  if (bg.startsWith("preset:")) {
    const p = BG_PRESETS.find((x) => x.id === bg.slice(7));
    if (!p) return null;
    return { style: { background: p.css, ...(p.size ? { backgroundSize: p.size } : {}) }, vars: varsFor(!!p.light), light: !!p.light, scrim: false };
  }
  if (bg.startsWith("color:")) {
    const c = bg.slice(6);
    return { style: { background: c }, vars: varsFor(hexLight(c)), light: hexLight(c), scrim: false };
  }
  if (bg.startsWith("img:")) {
    const url = bg.slice(4).replace(/"/g, "%22");
    return {
      style: { backgroundImage: `url("${url}")`, backgroundSize: "cover", backgroundPosition: "center" },
      vars: varsFor(false),
      light: false,
      scrim: true,
    };
  }
  return null;
}
