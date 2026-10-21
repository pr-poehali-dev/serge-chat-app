import data from "./smileys.json";

export interface SmileyDef {
  id: string;
  codes: string[];
  title: string;
  svg: string;
}

export const SMILEYS = data as SmileyDef[];

const BASE =
  '<circle cx="16" cy="16" r="15" fill="#ffd93b" stroke="#b8860b" stroke-width="1.2"/><ellipse cx="11.5" cy="7.5" rx="6.5" ry="3.2" fill="#fff" opacity=".35"/>';

const CODE_MAP = new Map<string, SmileyDef>();
SMILEYS.forEach((s) => s.codes.forEach((c) => CODE_MAP.set(c, s)));

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ALL_CODES = Array.from(CODE_MAP.keys()).sort((a, b) => b.length - a.length);
const SPLIT_RE = new RegExp(`(?<=^|\\s)(${ALL_CODES.map(escapeRe).join("|")})(?=$|\\s|[.,!?)])`, "g");

export function Smiley({ def, size = 20 }: { def: SmileyDef; size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="img"
      aria-label={def.title}
      className="inline-block shrink-0 align-text-bottom"
      dangerouslySetInnerHTML={{ __html: BASE + def.svg }}
    />
  );
}

export type TextPart = string | SmileyDef;

export function splitSmileys(text: string): TextPart[] {
  if (!text || !text.includes(" ") && !CODE_MAP.has(text)) {
    const only = CODE_MAP.get(text);
    return only ? [only] : [text];
  }
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(SPLIT_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push(text.slice(last, idx));
    parts.push(CODE_MAP.get(m[1]) as SmileyDef);
    last = idx + m[1].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

export function hasSmileys(text: string): boolean {
  return splitSmileys(text).some((p) => typeof p !== "string");
}
