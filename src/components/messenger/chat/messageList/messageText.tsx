import { ReactNode } from "react";

const MENTION_RE = /(?<![\p{L}\p{N}_@])@[\p{L}\p{N}_](?:[\p{L}\p{N}_.-]*[\p{L}\p{N}_])?/gu;

function renderPlain(text: string, mentions = false): ReactNode {
  if (!mentions || !text.includes("@")) return text;
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(MENTION_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push(text.slice(last, idx));
    parts.push(
      <span key={key++} className="rounded-md bg-purple-500/25 px-1 font-semibold text-purple-200">
        {m[0]}
      </span>
    );
    last = idx + m[0].length;
  }
  if (parts.length === 0) return text;
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function highlightText(text: string, query: string, isCurrent: boolean, mentions = false): ReactNode {
  const q = query.trim();
  if (!q) return renderPlain(text, mentions);
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: ReactNode[] = [];
  let from = 0;
  let idx = lower.indexOf(needle, from);
  let key = 0;
  while (idx !== -1) {
    if (idx > from) parts.push(text.slice(from, idx));
    parts.push(
      <mark
        key={key++}
        className={`rounded px-0.5 text-white ${isCurrent ? "bg-amber-500/80" : "bg-amber-400/35"}`}
      >
        {text.slice(idx, idx + needle.length)}
      </mark>
    );
    from = idx + needle.length;
    idx = lower.indexOf(needle, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return parts;
}
