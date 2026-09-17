import { RefObject, Dispatch, SetStateAction } from "react";
import Icon from "@/components/ui/icon";
import { CallScreen } from "./CallOverlays";
import { Chat, Message, Attachment, Topic } from "./types";

interface EmojiCategory {
  label: string;
  title: string;
  emojis: string[];
}

interface GifItem {
  url: string;
  title: string;
}

interface GifCategory {
  label: string;
  gifs: GifItem[];
}

interface ChatAreaProps {
  activeChat: Chat | undefined;
  call: { isVideo: boolean } | null;
  setCall: Dispatch<SetStateAction<{ isVideo: boolean } | null>>;
  showEncryptBadge: boolean;
  setShowEncryptBadge: Dispatch<SetStateAction<boolean>>;
  loadingMsgs: boolean;
  messages: Message[];
  botTyping?: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;

  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  attachMenuOpen: boolean;
  setAttachMenuOpen: Dispatch<SetStateAction<boolean>>;
  attachMenuRef: RefObject<HTMLDivElement>;
  fileInputRef: RefObject<HTMLInputElement>;
  imageInputRef: RefObject<HTMLInputElement>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;

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

  inputText: string;
  setInputText: Dispatch<SetStateAction<string>>;
  sendMessage: () => void;
  sending: boolean;

  topics?: Topic[];
  activeTopicId?: number | null;
  onSelectTopic?: (id: number | null) => void;
  onOpenCreateTopic?: () => void;
  onTogglePinTopic?: (topicId: number) => void;
  onOpenGroupMembers?: () => void;
}

export default function ChatArea({
  activeChat,
  call,
  setCall,
  showEncryptBadge,
  setShowEncryptBadge,
  loadingMsgs,
  messages,
  botTyping,
  messagesEndRef,
  attachments,
  setAttachments,
  attachMenuOpen,
  setAttachMenuOpen,
  attachMenuRef,
  fileInputRef,
  imageInputRef,
  handleFileSelect,
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
  inputText,
  setInputText,
  sendMessage,
  sending,
  topics,
  activeTopicId,
  onSelectTopic,
  onOpenCreateTopic,
  onTogglePinTopic,
  onOpenGroupMembers,
}: ChatAreaProps) {
  return (
    <main className="relative z-10 flex flex-1 flex-col">
      {/* Call overlay */}
      {call && activeChat && (
        <CallScreen
          chat={activeChat}
          isVideo={call.isVideo}
          onEnd={() => setCall(null)}
        />
      )}

      {activeChat ? (
        <>
          {/* Header */}
          <header className="glass-strong border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {activeChat.avatarUrl ? (
                  <img
                    src={activeChat.avatarUrl}
                    alt={activeChat.name}
                    className="h-11 w-11 rounded-2xl object-cover"
                  />
                ) : (
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${activeChat.color}cc, ${activeChat.color}55)` }}
                  >
                    {activeChat.avatar}
                  </div>
                )}
                {activeChat.online && !activeChat.isGroup && (
                  <span className="online-pulse absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-background" />
                )}
              </div>
              <div>
                <h2 className="font-bold text-white/95">{activeChat.name}</h2>
                <p className="text-xs text-white/35">
                  {activeChat.isGroup ? "групповой чат" : activeChat.online ? "в сети" : "был(а) недавно"}
                </p>
              </div>

              {showEncryptBadge && (
                <div className="ml-4 flex items-center gap-1.5 rounded-full bg-emerald-400/[0.08] border border-emerald-400/20 px-3 py-1.5 animate-fade-in">
                  <Icon name="Lock" size={11} className="text-emerald-400" />
                  <span className="text-[11px] text-emerald-400 font-medium">Зашифровано</span>
                  <button onClick={() => setShowEncryptBadge(false)} className="ml-1 text-emerald-400/40 hover:text-emerald-400 transition-colors">
                    <Icon name="X" size={10} />
                  </button>
                </div>
              )}

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setCall({ isVideo: false })}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                >
                  <Icon name="Phone" size={16} />
                </button>
                <button
                  onClick={() => setCall({ isVideo: true })}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                >
                  <Icon name="Video" size={16} />
                </button>
                {activeChat.isGroup ? (
                  <button
                    onClick={onOpenGroupMembers}
                    title="Участники группы"
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                  >
                    <Icon name="Users" size={16} />
                  </button>
                ) : (
                  <button className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all">
                    <Icon name="MoreVertical" size={16} />
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Topics bar (group chats only) */}
          {activeChat.isGroup && topics && (
            <div className="glass-strong border-b border-white/[0.06] px-4 py-2 flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => onSelectTopic?.(null)}
                className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                  !activeTopicId
                    ? "bg-white/[0.1] text-white"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
                }`}
              >
                <Icon name="MessageCircle" size={12} />
                Общий
              </button>
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className={`group/topic shrink-0 flex items-center gap-1 rounded-xl pl-3 pr-1.5 py-1.5 text-xs font-medium transition-all ${
                    activeTopicId === topic.id
                      ? "text-white"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
                  }`}
                  style={activeTopicId === topic.id ? { background: `${topic.color}33`, border: `1px solid ${topic.color}55` } : undefined}
                >
                  <button
                    onClick={() => onSelectTopic?.(topic.id)}
                    className="flex items-center gap-1.5"
                  >
                    {topic.pinned && <Icon name="Pin" size={10} className="text-amber-400 fill-amber-400" />}
                    <Icon name="Hash" size={12} style={{ color: activeTopicId === topic.id ? topic.color : undefined }} />
                    {topic.name}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onTogglePinTopic?.(topic.id); }}
                    title={topic.pinned ? "Открепить тему" : "Закрепить тему"}
                    className={`flex h-5 w-5 items-center justify-center rounded-lg transition-all ${
                      topic.pinned
                        ? "text-amber-400 opacity-100"
                        : "text-white/30 opacity-0 group-hover/topic:opacity-100 hover:text-amber-400"
                    }`}
                  >
                    <Icon name="Pin" size={11} className={topic.pinned ? "fill-amber-400" : ""} />
                  </button>
                </div>
              ))}
              <button
                onClick={onOpenCreateTopic}
                title="Создать тему"
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-xl text-white/30 hover:text-purple-400 hover:bg-purple-400/[0.08] transition-all"
              >
                <Icon name="Plus" size={14} />
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
            {loadingMsgs ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-2 w-2 rounded-full bg-purple-400/50 animate-pulse"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.out ? "justify-end" : "justify-start"} animate-fade-in`}
                  style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
                >
                  {!msg.out && (
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white mr-2 self-end mb-1"
                      style={{ background: `linear-gradient(135deg, ${activeChat.color}cc, ${activeChat.color}55)` }}
                    >
                      {activeChat.avatar[0]}
                    </div>
                  )}
                  <div className="max-w-[65%]">
                    <div className={`${/https?:\/\/.*\.gif/.test(msg.text) ? "p-1" : "px-4 py-2.5"} ${msg.out ? "msg-bubble-out text-white" : "msg-bubble-in text-white/85"}`}>
                      {/https?:\/\/.*\.gif/.test(msg.text) ? (
                        <img
                          src={msg.text.match(/https?:\/\/\S+\.gif/)?.[0]}
                          alt="GIF"
                          className="rounded-xl max-w-[220px] max-h-[160px] object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 mt-1 px-1 ${msg.out ? "justify-end" : "justify-start"}`}>
                      <span className="text-[10px] text-white/25">{msg.time}</span>
                      {msg.out && (
                        <Icon name={msg.read ? "CheckCheck" : "Check"} size={12} className={msg.read ? "text-purple-400" : "text-white/25"} />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {botTyping && (
              <div className="flex justify-start animate-fade-in">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white mr-2 self-end mb-1"
                  style={{ background: `linear-gradient(135deg, ${activeChat.color}cc, ${activeChat.color}55)` }}
                >
                  {activeChat.avatar[0]}
                </div>
                <div className="msg-bubble-in px-4 py-3 flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="glass-strong border-t border-white/[0.06] px-4 py-3">
            {/* Attachments preview */}
            {attachments.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2 animate-fade-in"
                    style={{ background: `${att.color}18`, border: `1px solid ${att.color}33` }}>
                    <Icon name={att.icon} size={14} style={{ color: att.color }} />
                    <div className="max-w-[120px]">
                      <p className="text-xs font-medium text-white/80 truncate">{att.name}</p>
                      <p className="text-[10px]" style={{ color: att.color }}>{att.size}</p>
                    </div>
                    <button onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                      className="ml-1 text-white/25 hover:text-white/60 transition-colors">
                      <Icon name="X" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-3">
              {/* Attach button with popup */}
              <div className="relative">
                <button
                  onClick={() => setAttachMenuOpen((v) => !v)}
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
                    attachMenuOpen
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      : "text-white/30 hover:text-purple-400 hover:bg-purple-400/[0.08]"
                  }`}
                >
                  <Icon name={attachMenuOpen ? "X" : "Paperclip"} size={18} />
                </button>

                {/* Attach menu */}
                {attachMenuOpen && (
                  <div ref={attachMenuRef} className="absolute bottom-14 left-0 rounded-2xl overflow-hidden animate-fade-in z-20"
                    style={{ background: "rgba(18,10,35,0.95)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)", minWidth: "200px" }}>
                    {[
                      { label: "Фото и видео", icon: "Image", color: "#a855f7", ref: imageInputRef, accept: "image/*,video/*" },
                      { label: "Файл", icon: "File", color: "#38bdf8", ref: fileInputRef, accept: "*" },
                      { label: "Документ", icon: "FileText", color: "#34d399", ref: null, accept: ".pdf,.doc,.docx,.xls,.xlsx" },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          if (item.ref) {
                            item.ref.current?.click();
                          } else {
                            fileInputRef.current!.accept = item.accept;
                            fileInputRef.current?.click();
                          }
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 hover:bg-white/[0.06] transition-all text-left"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl"
                          style={{ background: `${item.color}22` }}>
                          <Icon name={item.icon} size={16} style={{ color: item.color }} />
                        </div>
                        <span className="text-sm text-white/75">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

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
                    className="absolute bottom-14 left-0 w-80 rounded-2xl overflow-hidden animate-fade-in z-20 flex flex-col"
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

              {/* Hidden file inputs */}
              <input ref={fileInputRef} type="file" multiple className="hidden" accept="*" onChange={handleFileSelect} />
              <input ref={imageInputRef} type="file" multiple className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />

              <div className="flex-1 flex items-end gap-3 rounded-2xl bg-white/[0.05] border border-white/[0.07] px-4 py-3 focus-within:border-purple-500/40 transition-all">
                <textarea
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none"
                  placeholder={attachments.length > 0 ? "Добавить подпись..." : "Сообщение..."}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  style={{ maxHeight: "120px" }}
                />
                <Icon name="Lock" size={12} className="text-emerald-400/40 shrink-0 mb-0.5" />
              </div>

              <button
                onClick={sendMessage}
                disabled={(!inputText.trim() && attachments.length === 0) || sending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl gradient-btn text-white shadow-lg shadow-purple-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:-translate-y-0.5"
              >
                <Icon name={sending ? "Loader" : "Send"} size={16} className={sending ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center animate-fade-in">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl gradient-btn shadow-2xl shadow-purple-500/30">
              <Icon name="MessageCircle" size={36} className="text-white" />
            </div>
            <h2 className="text-xl font-bold gradient-text mb-2">Трынделка</h2>
            <p className="text-sm text-white/30">Выберите чат для начала общения</p>
          </div>
        </div>
      )}
    </main>
  );
}