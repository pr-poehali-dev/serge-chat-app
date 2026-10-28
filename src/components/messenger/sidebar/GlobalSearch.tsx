import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { API_CHATS } from "@/pages/index/config";
import { Chat, FoundMessage } from "../types";

interface GlobalSearchProps {
  sessionId: string;
  chats: Chat[];
  onOpenResult: (found: FoundMessage, query: string) => void;
}

interface Sender {
  id: number;
  name: string;
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

const selectClass =
  "w-full rounded-xl border border-fg/[0.08] bg-fg/[0.06] px-2.5 py-2 text-xs text-fg/85 outline-none focus:border-purple-500/40";

export default function GlobalSearch({ sessionId, chats, onOpenResult }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [chatId, setChatId] = useState("");
  const [senderId, setSenderId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [results, setResults] = useState<FoundMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState<{ q: string; key: string } | null>(null);

  const realChats = useMemo(() => chats.filter((c) => c.id > 0 && !c.isBot), [chats]);
  const activeFilters = [chatId, senderId, dateFrom, dateTo].filter(Boolean).length;
  const dateError = dateFrom && dateTo && dateFrom > dateTo ? "Дата «с» позже даты «по»" : "";
  const hasFilter = activeFilters > 0;
  const canSearch = (query.trim().length >= 2 || hasFilter) && !dateError;
  const filterKey = [chatId, senderId, dateFrom, dateTo].join("|");

  useEffect(() => {
    if (!filtersOpen || senders.length > 0) return;
    let alive = true;
    fetch(`${API_CHATS}?action=search-senders`, { headers: { "X-Session-Id": sessionId } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => alive && setSenders(d.senders || []))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [filtersOpen, sessionId]);

  useEffect(() => {
    if (!canSearch) {
      setResults([]);
      setLoading(false);
      setError("");
      setSearched(null);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ action: "search-messages", q: query.trim(), tz: String(-new Date().getTimezoneOffset()) });
      if (chatId) params.set("chat_id", chatId);
      if (senderId) params.set("sender_id", senderId);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      fetch(`${API_CHATS}?${params.toString()}`, { headers: { "X-Session-Id": sessionId } })
        .then(async (r) => {
          const d = await r.json().catch(() => ({}));
          if (cancelled) return;
          if (!r.ok) {
            setError(d.error || "Не удалось выполнить поиск");
            setResults([]);
          } else {
            setError("");
            setResults(d.results || []);
            setSearched({ q: query.trim(), key: filterKey });
          }
        })
        .catch(() => !cancelled && setError("Не удалось связаться с сервером"))
        .finally(() => !cancelled && setLoading(false));
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, filterKey, sessionId, canSearch]);

  const resetFilters = () => {
    setChatId("");
    setSenderId("");
    setDateFrom("");
    setDateTo("");
  };

  const highlightQuery = searched?.q || query.trim();

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 rounded-2xl border border-fg/[0.08] bg-fg/[0.06] px-3 py-3">
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

      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
            filtersOpen || hasFilter ? "text-purple-300" : "text-fg/45 hover:text-fg/70"
          }`}
        >
          <Icon name="SlidersHorizontal" size={13} />
          Фильтры{hasFilter ? `: ${activeFilters}` : ""}
        </button>
        {hasFilter && (
          <button type="button" onClick={resetFilters} className="text-[11px] text-fg/40 underline-offset-2 hover:text-fg/70 hover:underline">
            Сбросить
          </button>
        )}
      </div>

      {filtersOpen && (
        <div className="mb-3 space-y-2 rounded-2xl border border-fg/[0.06] bg-fg/[0.04] p-3 animate-fade-in">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-fg/45">Чат или группа</span>
            <select value={chatId} onChange={(e) => setChatId(e.target.value)} className={selectClass}>
              <option value="">Все чаты</option>
              {realChats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.isGroup ? "Группа: " : ""}
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-fg/45">Отправитель</span>
            <select value={senderId} onChange={(e) => setSenderId(e.target.value)} className={selectClass}>
              <option value="">Любой</option>
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-fg/45">Дата с</span>
              <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className={selectClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-fg/45">Дата по</span>
              <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className={selectClass} />
            </label>
          </div>
          {dateError && <p className="text-xs text-red-400">{dateError}</p>}
        </div>
      )}

      {error && <p className="px-1 pb-2 text-xs text-red-400">{error}</p>}

      {!canSearch ? (
        <p className="px-2 py-6 text-center text-xs leading-relaxed text-fg/30">
          Поиск идёт по всем вашим чатам и группам. Введите хотя бы две буквы или выберите фильтр.
        </p>
      ) : results.length === 0 && !loading && !error && searched && searched.key === filterKey ? (
        <p className="py-6 text-center text-xs text-fg/30">Ничего не найдено</p>
      ) : (
        <div className="space-y-1">
          {results.length > 0 && (
            <p className="px-1 pb-1 text-[11px] text-fg/30">
              Найдено: {results.length}
              {results.length >= 40 ? " (показаны первые 40, уточните запрос)" : ""}
            </p>
          )}
          {results.map((r) => (
            <button
              key={r.messageId}
              onClick={() => onOpenResult(r, highlightQuery)}
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
                <Highlight text={r.snippet} query={highlightQuery} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
