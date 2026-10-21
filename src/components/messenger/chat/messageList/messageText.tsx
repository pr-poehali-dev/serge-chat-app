import { ReactNode } from "react";
import { Smiley, splitSmileys } from "../../smileys/Smiley";

function renderPlain(text: string): ReactNode {
  const parts = splitSmileys(text);
  if (parts.length === 1 && typeof parts[0] === "string") return text;
  const onlySmileys = parts.every((p) => typeof p !== "string" || p.trim() === "");
  return parts.map((p, i) =>
    typeof p === "string" ? <span key={i}>{p}</span> : <Smiley key={i} def={p} size={onlySmileys ? 34 : 20} />
  );
}

export function highlightText(text: string, query: string, isCurrent: boolean): ReactNode {
  const q = query.trim();
  if (!q) return renderPlain(text);
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
