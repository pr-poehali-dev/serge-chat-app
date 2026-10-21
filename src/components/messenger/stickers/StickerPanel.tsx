import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { API_CHATS } from "@/pages/index/config";
import { STICKER_SETS, stickerTitle } from "./stickerCatalog";

interface StickerPanelProps {
  sessionId: string | null;
  onPick: (path: string) => void;
}

const FAV = "fav";

export default function StickerPanel({ sessionId, onPick }: StickerPanelProps) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeSet, setActiveSet] = useState<string>(STICKER_SETS[0].id);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!sessionId) return;
    fetch(`${API_CHATS}?action=stickers-favorite`, { headers: { "X-Session-Id": sessionId } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const list: string[] = d.stickers || [];
        setFavorites(list);
        if (list.length > 0) setActiveSet((cur) => (cur === STICKER_SETS[0].id && list.length > 0 ? FAV : cur));
      })
      .catch(() => undefined);
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (path: string) => {
    if (!sessionId || busy) return;
    setBusy(path);
    setError("");
    const wasFav = favorites.includes(path);
    setFavorites((prev) => (wasFav ? prev.filter((p) => p !== path) : [path, ...prev]));
    try {
      const res = await fetch(`${API_CHATS}?action=stickers-toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
        body: JSON.stringify({ sticker: path }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Не удалось сохранить");
    } catch (e) {
      setFavorites((prev) => (wasFav ? [path, ...prev] : prev.filter((p) => p !== path)));
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(null);
    }
  };

  const current = activeSet === FAV ? null : STICKER_SETS.find((s) => s.id === activeSet) || STICKER_SETS[0];
  const list = activeSet === FAV ? favorites.map((p) => ({ path: p, title: stickerTitle(p) })) : current?.stickers || [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-fg/[0.06] px-2 py-1.5">
        <button
          onClick={() => setActiveSet(FAV)}
          title="Избранные"
          aria-label="Избранные стикеры"
          className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-base transition-all ${
            activeSet === FAV ? "bg-purple-500/20 ring-1 ring-purple-400/40" : "hover:bg-fg/[0.08]"
          }`}
        >
          ⭐
        </button>
        {STICKER_SETS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSet(s.id)}
            title={s.title}
            aria-label={s.title}
            className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-base transition-all ${
              activeSet === s.id ? "bg-purple-500/20 ring-1 ring-purple-400/40" : "hover:bg-fg/[0.08]"
            }`}
          >
            {s.icon}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wider text-fg/25">
          {activeSet === FAV ? "Избранные" : current?.title}
        </p>
        {list.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs leading-relaxed text-fg/35">
            Здесь будут ваши любимые стикеры. Нажмите на звёздочку в углу любого стикера, чтобы сохранить его.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {list.map((st) => {
              const fav = favorites.includes(st.path);
              return (
                <div key={st.path} className="group relative aspect-square">
                  <button
                    onClick={() => onPick(st.path)}
                    title={st.title}
                    aria-label={`Отправить: ${st.title}`}
                    className="flex h-full w-full items-center justify-center rounded-2xl p-1.5 transition-transform hover:scale-105 hover:bg-fg/[0.06] active:scale-95"
                  >
                    <img src={st.path} alt={st.title} className="h-full w-full object-contain" loading="lazy" draggable={false} />
                  </button>
                  <button
                    onClick={() => toggle(st.path)}
                    disabled={!sessionId}
                    title={fav ? "Убрать из избранного" : "В избранное"}
                    aria-label={fav ? "Убрать из избранного" : "Добавить в избранное"}
                    className={`absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/45 transition-opacity focus:opacity-100 ${
                      fav ? "opacity-100" : "opacity-60 group-hover:opacity-100 max-[639px]:opacity-90"
                    }`}
                  >
                    <Icon name="Star" size={13} className={fav ? "fill-amber-400 text-amber-400" : "text-white"} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {error && <p className="px-1 pt-2 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
