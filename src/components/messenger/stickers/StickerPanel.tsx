import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { API_CHATS } from "@/pages/index/config";
import { STICKER_SETS, stickerTitle } from "./stickerCatalog";
import { useCustomStickers } from "./useCustomStickers";

interface StickerPanelProps {
  sessionId: string | null;
  onPick: (path: string) => void;
  onSchedule?: (path: string, whenMs: number) => Promise<string | null>;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const FAV = "fav";
const NEW_PACK = "new-pack";
const packKey = (id: number) => `pack-${id}`;

export default function StickerPanel({ sessionId, onPick, onSchedule }: StickerPanelProps) {
  const [later, setLater] = useState(false);
  const [laterWhen, setLaterWhen] = useState("");
  const [laterNote, setLaterNote] = useState("");

  const toggleLater = () => {
    if (!later) {
      const d = new Date(Date.now() + 3600000);
      d.setMinutes(0, 0, 0);
      setLaterWhen(toLocalInput(d));
      setLaterNote("");
    }
    setLater((v) => !v);
  };

  const pickSticker = async (path: string) => {
    if (!later || !onSchedule) {
      onPick(path);
      return;
    }
    const ms = new Date(laterWhen).getTime();
    if (!laterWhen || Number.isNaN(ms) || ms <= Date.now() + 15000) {
      setLaterNote("Выберите время в будущем");
      return;
    }
    const err = await onSchedule(path, ms);
    setLaterNote(err ? err : "Стикер запланирован");
    if (!err) window.setTimeout(() => setLaterNote(""), 2500);
  };

  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeSet, setActiveSet] = useState<string>(STICKER_SETS[0].id);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const custom = useCustomStickers(sessionId);
  const [newTitle, setNewTitle] = useState("");
  const [manage, setManage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const activePack = custom.packs.find((p) => packKey(p.id) === activeSet) || null;
  const isBuiltin = !activePack && activeSet !== FAV && activeSet !== NEW_PACK;
  const current = isBuiltin ? STICKER_SETS.find((s) => s.id === activeSet) || STICKER_SETS[0] : null;
  const list = activeSet === FAV
    ? favorites.map((p) => ({ path: p, title: stickerTitle(p) }))
    : activePack
    ? activePack.stickers.map((st) => ({ path: st.url, title: "Свой стикер" }))
    : current?.stickers || [];

  const createPack = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const pack = await custom.createPack(title);
    if (pack) {
      setNewTitle("");
      setActiveSet(packKey(pack.id));
      setManage(true);
    }
  };

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
        {custom.packs.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setActiveSet(packKey(p.id));
              setManage(false);
            }}
            title={p.title}
            aria-label={`Набор: ${p.title}`}
            className={`flex h-9 min-w-9 max-w-[96px] items-center justify-center gap-1 rounded-xl px-2 text-xs transition-all ${
              activeSet === packKey(p.id) ? "bg-purple-500/20 ring-1 ring-purple-400/40" : "hover:bg-fg/[0.08]"
            }`}
          >
            {p.stickers[0] ? (
              <img src={p.stickers[0].url} alt="" className="h-6 w-6 object-contain" draggable={false} />
            ) : (
              <Icon name="Smile" size={16} />
            )}
          </button>
        ))}
        <button
          onClick={() => setActiveSet(NEW_PACK)}
          title="Создать свой набор"
          aria-label="Создать свой набор стикеров"
          className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2 transition-all ${
            activeSet === NEW_PACK ? "bg-purple-500/20 ring-1 ring-purple-400/40" : "text-fg/50 hover:bg-fg/[0.08]"
          }`}
        >
          <Icon name="Plus" size={16} />
        </button>
      </div>

      {onSchedule && activeSet !== NEW_PACK && (
        <div className="shrink-0 border-b border-fg/[0.06] px-3 py-1.5">
          <button
            type="button"
            onClick={toggleLater}
            className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${later ? "text-purple-300" : "text-fg/40 hover:text-fg/70"}`}
          >
            <Icon name="Clock" size={12} />
            {later ? "Отправить позже: включено" : "Отправить позже"}
          </button>
          {later && (
            <div className="mt-1.5 space-y-1">
              <input
                type="datetime-local"
                value={laterWhen}
                onChange={(e) => setLaterWhen(e.target.value)}
                className="w-full rounded-lg border border-fg/[0.08] bg-fg/[0.06] px-2 py-1.5 text-xs text-fg/85 outline-none focus:border-purple-500/40"
              />
              <p className={`text-[11px] ${laterNote === "Стикер запланирован" ? "text-emerald-400" : laterNote ? "text-red-400" : "text-fg/35"}`}>
                {laterNote || "Нажмите на стикер, и он уйдёт в выбранное время"}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {activeSet === NEW_PACK ? (
          <div className="space-y-3 p-2">
            <p className="text-xs leading-relaxed text-fg/50">
              Создайте свой набор: назовите его и загрузите картинки. Потом их можно отправлять в чат как обычные стикеры.
            </p>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createPack();
              }}
              maxLength={40}
              placeholder="Название набора"
              className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.06] px-3 py-2 text-sm text-fg/85 outline-none placeholder:text-fg/30 focus:border-purple-500/40"
            />
            <button
              onClick={createPack}
              disabled={!newTitle.trim() || custom.busy || !sessionId}
              className="w-full rounded-xl gradient-btn py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Создать набор
            </button>
            {custom.error && <p className="text-xs text-red-400">{custom.error}</p>}
          </div>
        ) : (
        <>
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="truncate text-[10px] font-medium uppercase tracking-wider text-fg/25">
            {activeSet === FAV ? "Избранные" : activePack ? activePack.title : current?.title}
          </p>
          {activePack && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={custom.busy}
                className="flex items-center gap-1 rounded-lg bg-purple-500/15 px-2 py-1 text-[11px] font-medium text-purple-300 hover:bg-purple-500/25 disabled:opacity-50"
              >
                <Icon name={custom.busy ? "Loader" : "ImagePlus"} size={12} className={custom.busy ? "animate-spin" : ""} />
                Добавить
              </button>
              <button
                onClick={() => setManage((v) => !v)}
                title="Удалять стикеры"
                className={`flex h-6 w-6 items-center justify-center rounded-lg ${manage ? "bg-red-500/20 text-red-400" : "text-fg/40 hover:bg-fg/[0.08]"}`}
              >
                <Icon name="Trash2" size={12} />
              </button>
            </div>
          )}
        </div>
        {activePack && (
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = "";
              if (files.length > 0) custom.addImages(activePack.id, files);
            }}
          />
        )}
        {list.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs leading-relaxed text-fg/35">
            {activePack
              ? "В наборе пока пусто. Нажмите «Добавить» и выберите картинки."
              : "Здесь будут ваши любимые стикеры. Нажмите на звёздочку в углу любого стикера, чтобы сохранить его."}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {list.map((st) => {
              const fav = favorites.includes(st.path);
              return (
                <div key={st.path} className="group relative aspect-square">
                  <button
                    onClick={() => pickSticker(st.path)}
                    title={st.title}
                    aria-label={`Отправить: ${st.title}`}
                    className="flex h-full w-full items-center justify-center rounded-2xl p-1.5 transition-transform hover:scale-105 hover:bg-fg/[0.06] active:scale-95"
                  >
                    <img src={st.path} alt={st.title} className="h-full w-full object-contain" loading="lazy" draggable={false} />
                  </button>
                  {activePack ? (
                    manage && (
                      <button
                        onClick={() => {
                          const target = activePack.stickers.find((x) => x.url === st.path);
                          if (target) custom.deleteSticker(activePack.id, target.id);
                        }}
                        title="Удалить стикер"
                        aria-label="Удалить стикер из набора"
                        className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/80"
                      >
                        <Icon name="X" size={13} className="text-white" />
                      </button>
                    )
                  ) : (
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
                  )}
                </div>
              );
            })}
          </div>
        )}
        {activePack && !manage && list.length > 0 && (
          <div className="px-1 pt-3">
            <button onClick={() => custom.deletePack(activePack.id)} className="text-[11px] text-fg/30 underline-offset-2 hover:text-red-400 hover:underline">
              Удалить набор
            </button>
          </div>
        )}
        {(error || (activePack && custom.error)) && <p className="px-1 pt-2 text-xs text-red-400">{error || custom.error}</p>}
        </>
        )}
      </div>
    </div>
  );
}
