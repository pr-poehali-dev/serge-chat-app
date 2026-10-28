import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { API_CHATS } from "@/pages/index/config";
import { AuthUser, Chat, FoundMessage, GalleryItem, Tab } from "../types";
import GalleryViewer from "./GalleryViewer";

interface GalleryTabProps {
  activeTab: Tab;
  authUser: AuthUser | null;
  chats: Chat[];
  onOpenFoundMessage?: (found: FoundMessage, query: string) => void;
}

type TypeFilter = "all" | "photo" | "video";

const TYPES: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "Всё" },
  { id: "photo", label: "Фото" },
  { id: "video", label: "Видео" },
];

export default function GalleryTab({ activeTab, authUser, chats, onOpenFoundMessage }: GalleryTabProps) {
  const [type, setType] = useState<TypeFilter>("all");
  const [chatId, setChatId] = useState("");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const realChats = useMemo(() => chats.filter((c) => c.id > 0 && !c.isBot), [chats]);
  const sessionId = authUser?.sessionId;

  const fetchPage = useCallback(
    async (offset: number, signal: { cancelled: boolean }) => {
      if (!sessionId) return;
      const params = new URLSearchParams({ action: "gallery", type, offset: String(offset), tz: String(-new Date().getTimezoneOffset()) });
      if (chatId) params.set("chat_id", chatId);
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_CHATS}?${params.toString()}`, { headers: { "X-Session-Id": sessionId } });
        const d = await res.json().catch(() => ({}));
        if (signal.cancelled) return;
        if (!res.ok) {
          setError(d.error || "Не удалось загрузить файлы");
          return;
        }
        setItems((prev) => (offset === 0 ? d.items || [] : [...prev, ...(d.items || [])]));
        setHasMore(!!d.hasMore);
        setLoaded(true);
      } catch {
        if (!signal.cancelled) setError("Не удалось связаться с сервером");
      } finally {
        if (!signal.cancelled) setLoading(false);
      }
    },
    [sessionId, type, chatId]
  );

  useEffect(() => {
    if (activeTab !== "gallery" || !sessionId) return;
    const signal = { cancelled: false };
    setItems([]);
    setHasMore(false);
    setLoaded(false);
    setViewIndex(null);
    fetchPage(0, signal);
    return () => {
      signal.cancelled = true;
    };
  }, [activeTab, sessionId, type, chatId, reloadKey, fetchPage]);

  if (activeTab !== "gallery") return null;

  const openMessage = (item: GalleryItem) => {
    setViewIndex(null);
    onOpenFoundMessage?.(
      {
        messageId: item.messageId,
        chatId: item.chatId,
        topicId: item.topicId,
        chatName: item.chatName,
        isGroup: item.isGroup,
        senderName: item.senderName,
        snippet: "",
        time: item.time,
      },
      ""
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-xs text-fg/30 font-medium">МЕДИАФАЙЛЫ</p>
        <div className="flex gap-2 text-xs">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={
                type === t.id
                  ? "text-fg/60 border-b border-purple-400 pb-0.5"
                  : "text-fg/30 hover:text-fg/60 transition-colors"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <label className="mb-3 block">
        <select
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.06] px-2.5 py-2 text-xs text-fg/85 outline-none focus:border-purple-500/40"
        >
          <option value="">Все чаты</option>
          {realChats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.isGroup ? "Группа: " : ""}
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-red-500/10 px-3 py-2">
          <p className="text-xs text-red-300">{error}</p>
          <button onClick={() => setReloadKey((k) => k + 1)} className="shrink-0 text-xs text-red-200 underline">
            Повторить
          </button>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-10">
          <Icon name="Loader" size={18} className="animate-spin text-fg/30" />
        </div>
      ) : loaded && items.length === 0 && !error ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Icon name="ImageOff" size={22} className="text-fg/15" />
          <p className="text-xs text-fg/30">
            {chatId || type !== "all" ? "По выбранным фильтрам ничего нет" : "Пока нет фото, GIF и видео"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item, i) => (
            <button
              key={`${item.messageId}-${i}`}
              type="button"
              onClick={() => setViewIndex(i)}
              className="aspect-square rounded-xl overflow-hidden relative cursor-pointer bg-fg/[0.06] hover:scale-[1.03] transition-transform"
              aria-label={item.type === "video" ? "Открыть видео" : "Открыть фото"}
            >
              {item.type === "video" ? (
                <>
                  <video src={item.url} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <Icon name="Play" size={22} className="text-white drop-shadow" />
                  </span>
                </>
              ) : (
                <img src={item.url} alt={item.fileName || ""} loading="lazy" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => fetchPage(items.length, { cancelled: false })}
          disabled={loading}
          className="mt-3 w-full rounded-xl bg-fg/[0.06] py-2.5 text-xs font-medium text-fg/60 hover:bg-fg/[0.1] disabled:opacity-50"
        >
          {loading ? "Загружаю..." : "Показать ещё"}
        </button>
      )}

      {viewIndex !== null && (
        <GalleryViewer
          items={items}
          index={viewIndex}
          onIndex={setViewIndex}
          onClose={() => setViewIndex(null)}
          onOpenMessage={openMessage}
        />
      )}
    </div>
  );
}
