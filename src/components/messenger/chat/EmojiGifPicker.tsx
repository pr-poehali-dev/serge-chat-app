import { RefObject, Dispatch, SetStateAction } from "react";
import Icon from "@/components/ui/icon";
import { SMILEYS, Smiley } from "../smileys/Smiley";
import { useGifSearch } from "@/pages/index/useGifSearch";
import StickerPanel from "../stickers/StickerPanel";

export interface EmojiCategory {
  label: string;
  title: string;
  emojis: string[];
}

export interface GifItem {
  url: string;
  title: string;
}

export interface GifCategory {
  label: string;
  gifs: GifItem[];
}

interface EmojiGifPickerProps {
  emojiPickerOpen: boolean;
  setEmojiPickerOpen: Dispatch<SetStateAction<boolean>>;
  emojiPickerRef: RefObject<HTMLDivElement | null>;
  emojiTab: "emoji" | "icq" | "stickers" | "gif";
  setEmojiTab: Dispatch<SetStateAction<"emoji" | "icq" | "stickers" | "gif">>;
  EMOJI_CATEGORIES: EmojiCategory[];
  GIF_CATEGORIES: GifCategory[];
  gifSearch: string;
  setGifSearch: Dispatch<SetStateAction<string>>;
  filteredGifs: GifItem[] | null;
  setInputText: Dispatch<SetStateAction<string>>;
  onPickGif?: (url: string) => void;
  onPickSticker?: (path: string) => void;
  onScheduleSticker?: (path: string, whenMs: number) => Promise<string | null>;
  sessionId?: string | null;
}

export default function EmojiGifPicker({
  emojiPickerOpen,
  setEmojiPickerOpen,
  emojiPickerRef,
  emojiTab,
  setEmojiTab,
  EMOJI_CATEGORIES,
  GIF_CATEGORIES,
  gifSearch,
  setGifSearch,
  filteredGifs,
  setInputText,
  onPickGif,
  onPickSticker,
  onScheduleSticker,
  sessionId = null,
}: EmojiGifPickerProps) {
  const remote = useGifSearch(gifSearch, emojiPickerOpen && emojiTab === "gif");
  const useRemote = remote.enabled;
  return (
    <>
      {/* Emoji / GIF picker */}
      <div className="relative" ref={emojiPickerRef}>
        <button
          onClick={() => setEmojiPickerOpen((v) => !v)}
          className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
            emojiPickerOpen
              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
              : "text-fg/30 hover:text-purple-400 hover:bg-purple-400/[0.08]"
          }`}
        >
          <Icon name="Smile" size={18} />
        </button>

        {emojiPickerOpen && (
          <div
            className="absolute bottom-14 left-0 w-[calc(100vw-1.5rem)] max-w-80 rounded-2xl overflow-hidden animate-fade-in z-20 flex flex-col"
            style={{ background: "hsl(var(--popover) / 0.97)", border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))", backdropFilter: "blur(24px)", height: "min(340px, 55dvh)" }}
          >
            {/* Tabs */}
            <div className="flex border-b border-fg/[0.07] shrink-0">
              {[
                { id: "emoji" as const, label: "😊 Эмодзи" },
                { id: "icq" as const, label: "🌼 ICQ" },
                ...(onPickSticker ? [{ id: "stickers" as const, label: "🖼 Стикеры" }] : []),
                { id: "gif" as const, label: "🎬 GIF" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setEmojiTab(t.id)}
                  className={`flex-1 py-3 text-sm font-medium transition-all ${
                    emojiTab === t.id
                      ? "text-foreground border-b-2 border-purple-400"
                      : "text-fg/35 hover:text-fg/60"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {emojiTab === "emoji" && (
              <div className="flex flex-1 overflow-hidden">
                {/* Category sidebar */}
                <div className="flex flex-col gap-1 p-2 border-r border-fg/[0.06] shrink-0">
                  {EMOJI_CATEGORIES.map((cat, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        document.getElementById(`emoji-cat-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-base hover:bg-fg/[0.08] transition-all"
                      title={cat.title}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                {/* Emoji grid */}
                <div className="flex-1 overflow-y-auto p-2">
                  {EMOJI_CATEGORIES.map((cat, ci) => (
                    <div key={ci} id={`emoji-cat-${ci}`} className="mb-3">
                      <p className="text-[10px] text-fg/25 font-medium mb-1.5 px-1 uppercase tracking-wider">{cat.title}</p>
                      <div className="grid grid-cols-8 gap-0.5">
                        {cat.emojis.map((em, ei) => (
                          <button
                            key={ei}
                            onClick={() => {
                              setInputText((prev) => prev + em);
                              setEmojiPickerOpen(false);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-fg/[0.08] transition-all hover:scale-110"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {emojiTab === "icq" && (
              <div className="flex-1 overflow-y-auto p-3">
                <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wider text-fg/25">Классические смайлы</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {SMILEYS.map((sm) => (
                    <button
                      key={sm.id}
                      title={`${sm.title}  ${sm.codes[0]}`}
                      onClick={() => {
                        setInputText((prev) => (prev && !prev.endsWith(" ") ? prev + " " : prev) + sm.codes[0] + " ");
                        setEmojiPickerOpen(false);
                      }}
                      className="flex h-11 w-full items-center justify-center rounded-xl transition-transform hover:scale-110 hover:bg-fg/[0.08]"
                    >
                      <Smiley def={sm} size={30} />
                    </button>
                  ))}
                </div>
                <p className="mt-3 px-1 text-[11px] leading-snug text-fg/30">
                  Можно набирать и вручную: например :-) или ;-) превратятся в смайл.
                </p>
              </div>
            )}

            {emojiTab === "stickers" && onPickSticker && (
              <StickerPanel
                sessionId={sessionId}
                onSchedule={onScheduleSticker}
                onPick={(path) => {
                  onPickSticker(path);
                  setEmojiPickerOpen(false);
                }}
              />
            )}

            {emojiTab === "gif" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Search */}
                <div className="px-3 py-2 border-b border-fg/[0.06] shrink-0">
                  <div className="flex items-center gap-2 rounded-xl bg-fg/[0.06] border border-fg/[0.08] px-3 py-2">
                    <Icon name="Search" size={13} className="text-fg/30" />
                    <input
                      className="flex-1 bg-transparent text-xs text-fg/80 placeholder:text-fg/25 outline-none"
                      placeholder="Поиск GIF..."
                      value={gifSearch}
                      onChange={(e) => setGifSearch(e.target.value)}
                    />
                    {gifSearch && (
                      <button onClick={() => setGifSearch("")} className="text-fg/25 hover:text-fg/60">
                        <Icon name="X" size={12} />
                      </button>
                    )}
                  </div>
                </div>
                {/* GIF grid */}
                <div
                  className="flex-1 overflow-y-auto p-2"
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    if (useRemote && el.scrollTop + el.clientHeight >= el.scrollHeight - 80) remote.loadMore();
                  }}
                >
                  {useRemote ? (
                    <>
                      {!gifSearch.trim() && remote.items.length > 0 && (
                        <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wider text-fg/25">Популярные</p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {remote.items.map((gif) => (
                          <button
                            key={gif.id}
                            title={gif.title}
                            onClick={() => {
                              if (onPickGif) onPickGif(gif.url);
                              else setInputText((prev) => (prev ? prev + " " + gif.url : gif.url));
                              setEmojiPickerOpen(false);
                            }}
                            className="aspect-video rounded-xl overflow-hidden hover:scale-[1.03] transition-transform bg-fg/[0.04]"
                          >
                            <img src={gif.preview} alt={gif.title} className="w-full h-full object-cover" loading="lazy" />
                          </button>
                        ))}
                      </div>
                      {remote.loading && (
                        <div className="flex justify-center py-4">
                          <Icon name="Loader" size={18} className="animate-spin text-fg/40" />
                        </div>
                      )}
                      {!remote.loading && remote.error && <p className="py-4 text-center text-xs text-red-400">{remote.error}</p>}
                      {!remote.loading && !remote.error && remote.items.length === 0 && (
                        <p className="py-6 text-center text-xs text-fg/35">Ничего не найдено. Попробуйте другое слово</p>
                      )}
                      <p className="pt-3 text-center text-[10px] text-fg/25">GIF от KLIPY</p>
                    </>
                  ) : filteredGifs ? (
                    <div className="grid grid-cols-2 gap-2">
                      {filteredGifs.map((gif, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (onPickGif) onPickGif(gif.url);
                            else setInputText((prev) => (prev ? prev + " " + gif.url : gif.url));
                            setEmojiPickerOpen(false);
                          }}
                          className="aspect-video rounded-xl overflow-hidden hover:scale-[1.03] transition-transform bg-fg/[0.04]"
                        >
                          <img src={gif.url} alt={gif.title} className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    GIF_CATEGORIES.map((cat, ci) => (
                      <div key={ci} className="mb-4">
                        <p className="text-[10px] text-fg/25 font-medium mb-2 px-1 uppercase tracking-wider">{cat.label}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {cat.gifs.map((gif, gi) => (
                            <button
                              key={gi}
                              onClick={() => {
                                if (onPickGif) onPickGif(gif.url);
                                else setInputText((prev) => (prev ? prev + " " + gif.url : gif.url));
                                setEmojiPickerOpen(false);
                              }}
                              className="aspect-video rounded-xl overflow-hidden hover:scale-[1.03] transition-transform bg-fg/[0.04]"
                            >
                              <img src={gif.url} alt={gif.title} className="w-full h-full object-cover" loading="lazy" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}