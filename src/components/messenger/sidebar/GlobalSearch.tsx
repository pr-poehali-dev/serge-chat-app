import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { API_CHATS } from "@/pages/index/config";
import { FoundMessage } from "../types";

interface GlobalSearchProps {
  sessionId: string;
  onOpenResult: (found: FoundMessage, query: string) => void;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let from = 0;
  let idx = lower.indexOf(q);
  let key = 0;
  while (idx !== -1) {
    if (idx > from) parts.push(text.slice(from, idx));
    parts.push(
      <mark key={key++} className="rounded bg-amber-400/40 px-0.5 text-fg">
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    from = idx + q.length;
    idx = lower.indexOf(q, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return <>{parts}</>;
}

export default function GlobalSearch({ sessionId, onOpenResult }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchedFor, setSearchedFor] = useState("");

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setError("");
      setSearchedFor("");
      return;
    }
    setLoading(true);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetch(`${API_CHATS}?action=search-messages&q=${encodeURIComponent(q)}`, { headers: { "X-Session-Id": sessionId } })
        .then(async (r) => {
          const d = await r.json().catch(() => ({}));
          if (cancelled) return;
          if (!r.ok) {
            setError(d.error || "Не удалось выполнить поиск");
            setResults([]);
          } else {
            setError("");
            setResults(d.results || []);
            setSearchedFor(q);
          }
        })
        .catch(() => !cancelled && setError("Не удалось связаться с сервером"))
        .finally(() => !cancelled && setLoading(false));
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, sessionId]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-fg/[0.08] bg-fg/[0.06] px-3 py-3">
        <Icon name="MessageSquareText" size={16} className="text-purple-400" />
        <input
          className="flex-1 bg-transparent text-sm text-fg/80 outline-none placeholder:text-fg/25"
          placeholder="Слово или фраза в сообщениях..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && <Icon name="Loader" size={14} className="animate-spin text-fg/30" />}
        {query && !loading && (
          <button onClick={() => setQuery("")} className="text-fg/25 hover:text-fg/60">
            <Icon name="X" size={14} />
          </button>
        )}
      </div>

      {error && <p className="px-1 pb-2 text-xs text-red-400">{error}</p>}

      {query.trim().length < 2 ? (
        <p className="px-2 py-6 text-center text-xs leading-relaxed text-fg/30">
          Поиск идёт по всем вашим чатам и группам. Введите хотя бы две буквы.
        </p>
      ) : results.length === 0 && !loading && !error && searchedFor === query.trim() ? (
        <p className="py-6 text-center text-xs text-fg/30">Ничего не найдено</p>
      ) : (
        <div className="space-y-1">
          {results.map((r) => (
            <button
              key={r.messageId}
              onClick={() => onOpenResult(r, searchedFor || query.trim())}
              className="block w-full rounded-2xl px-3 py-2.5 text-left transition-all hover:bg-fg/[0.06]"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-fg/85">
                  <Icon name={r.isGroup ? "Users" : "User"} size={12} className="shrink-0 text-purple-400" />
                  <span className="truncate">{r.chatName}</span>
                  {r.topicName && <span className="shrink-0 truncate font-normal text-fg/40">· {r.topicName}</span>}
                </span>
                <span className="shrink-0 text-[10px] text-fg/30">{r.time}</span>
              </span>
              <span className="mt-0.5 block text-[11px] text-fg/40">{r.senderName}</span>
              <span className="mt-0.5 block break-words text-xs leading-snug text-fg/65 line-clamp-3">
                <Highlight text={r.snippet} query={searchedFor || query} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
