import { RefObject, Dispatch, SetStateAction } from "react";
import Icon from "@/components/ui/icon";

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
  emojiPickerRef: RefObject<HTMLDivElement>;
  emojiTab: "emoji" | "gif";
  setEmojiTab: Dispatch<SetStateAction<"emoji" | "gif">>;
  EMOJI_CATEGORIES: EmojiCategory[];
  GIF_CATEGORIES: GifCategory[];
  gifSearch: string;
  setGifSearch: Dispatch<SetStateAction<string>>;
  filteredGifs: GifItem[] | null;
  setInputText: Dispatch<SetStateAction<string>>;
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
}: EmojiGifPickerProps) {
  return (
    <>
      {/* Emoji / GIF picker */}
      <div className="relative" ref={emojiPickerRef}>
        <button
          onClick={() => setEmojiPickerOpen((v) => !v)}
          className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
            emojiPickerOpen
              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
              : "text-white/30 hover:text-purple-400 hover:bg-purple-400/[0.08]"
          }`}
        >
          <Icon name="Smile" size={18} />
        </button>

        {emojiPickerOpen && (
          <div
            className="absolute bottom-14 left-0 w-[calc(100vw-2rem)] max-w-80 rounded-2xl overflow-hidden animate-fade-in z-20 flex flex-col"
            style={{ background: "rgba(14,8,28,0.97)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(24px)", height: "340px" }}
          >
            {/* Tabs */}
            <div className="flex border-b border-white/[0.07] shrink-0">
              {[
                { id: "emoji" as const, label: "😊 Эмодзи" },
                { id: "gif" as const, label: "🎬 GIF" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setEmojiTab(t.id)}
                  className={`flex-1 py-3 text-sm font-medium transition-all ${
                    emojiTab === t.id
                      ? "text-white border-b-2 border-purple-400"
                      : "text-white/35 hover:text-white/60"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {emojiTab === "emoji" && (
              <div className="flex flex-1 overflow-hidden">
                {/* Category sidebar */}
                <div className="flex flex-col gap-1 p-2 border-r border-white/[0.06] shrink-0">
                  {EMOJI_CATEGORIES.map((cat, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        document.getElementById(`emoji-cat-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-base hover:bg-white/[0.08] transition-all"
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
                      <p className="text-[10px] text-white/25 font-medium mb-1.5 px-1 uppercase tracking-wider">{cat.title}</p>
                      <div className="grid grid-cols-8 gap-0.5">
                        {cat.emojis.map((em, ei) => (
                          <button
                            key={ei}
                            onClick={() => {
                              setInputText((prev) => prev + em);
                              setEmojiPickerOpen(false);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-white/[0.08] transition-all hover:scale-110"
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

            {emojiTab === "gif" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Search */}
                <div className="px-3 py-2 border-b border-white/[0.06] shrink-0">
                  <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2">
                    <Icon name="Search" size={13} className="text-white/30" />
                    <input
                      className="flex-1 bg-transparent text-xs text-white/80 placeholder:text-white/25 outline-none"
                      placeholder="Поиск GIF..."
                      value={gifSearch}
                      onChange={(e) => setGifSearch(e.target.value)}
                    />
                    {gifSearch && (
                      <button onClick={() => setGifSearch("")} className="text-white/25 hover:text-white/60">
                        <Icon name="X" size={12} />
                      </button>
                    )}
                  </div>
                </div>
                {/* GIF grid */}
                <div className="flex-1 overflow-y-auto p-2">
                  {filteredGifs ? (
                    <div className="grid grid-cols-2 gap-2">
                      {filteredGifs.map((gif, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInputText((prev) => prev ? prev + " " + gif.url : gif.url);
                            setEmojiPickerOpen(false);
                          }}
                          className="aspect-video rounded-xl overflow-hidden hover:scale-[1.03] transition-transform bg-white/[0.04]"
                        >
                          <img src={gif.url} alt={gif.title} className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    GIF_CATEGORIES.map((cat, ci) => (
                      <div key={ci} className="mb-4">
                        <p className="text-[10px] text-white/25 font-medium mb-2 px-1 uppercase tracking-wider">{cat.label}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {cat.gifs.map((gif, gi) => (
                            <button
                              key={gi}
                              onClick={() => {
                                setInputText((prev) => prev ? prev + " " + gif.url : gif.url);
                                setEmojiPickerOpen(false);
                              }}
                              className="aspect-video rounded-xl overflow-hidden hover:scale-[1.03] transition-transform bg-white/[0.04]"
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
