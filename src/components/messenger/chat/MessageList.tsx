import { RefObject, useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { Chat, Message } from "../types";
import VoiceMessage from "../media/VoiceMessage";
import CircleMessage from "../media/CircleMessage";
import ReplyQuote from "./ReplyQuote";
import { ImageAttachment, FileCard } from "./FileAttachment";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

interface MessageListProps {
  activeChat: Chat;
  loadingMsgs: boolean;
  messages: Message[];
  botTyping?: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
  currentUserId?: number;
  onToggleReaction?: (messageId: number, emoji: string) => void;
  onTranscribe?: (messageId: number) => Promise<string | null>;
  onReply?: (msg: Message) => void;
  onEdit?: (msg: Message) => void;
  onRemove?: (messageId: number) => void;
}

export default function MessageList({
  activeChat,
  loadingMsgs,
  messages,
  botTyping,
  messagesEndRef,
  currentUserId,
  onToggleReaction,
  onTranscribe,
  onReply,
  onEdit,
  onRemove,
}: MessageListProps) {
  const [reactionPickerFor, setReactionPickerFor] = useState<number | null>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  const jumpTo = (messageId: number) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(messageId);
    window.setTimeout(() => setHighlightId(null), 1500);
  };

  useEffect(() => {
    if (reactionPickerFor === null) return;
    const handler = (e: MouseEvent) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target as Node)) {
        setReactionPickerFor(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [reactionPickerFor]);

  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5 space-y-3">
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
          messages.map((msg, i) => {
            const reactionEntries = Object.entries(msg.reactions || {}).filter(([, users]) => users.length > 0);
            return (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              className={`group/msg flex rounded-2xl transition-colors duration-500 ${msg.out ? "justify-end" : "justify-start"} animate-fade-in ${
                highlightId === msg.id ? "bg-purple-500/15" : ""
              }`}
              style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
            >
              {!msg.out && (
                msg.senderAvatarUrl && activeChat.isGroup ? (
                  <img
                    src={msg.senderAvatarUrl}
                    alt={msg.senderName || ""}
                    className="h-7 w-7 shrink-0 rounded-xl object-cover mr-2 self-end mb-1"
                  />
                ) : (
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white mr-2 self-end mb-1"
                    style={{ background: `linear-gradient(135deg, ${(activeChat.isGroup && msg.senderColor) || activeChat.color}cc, ${(activeChat.isGroup && msg.senderColor) || activeChat.color}55)` }}
                  >
                    {activeChat.isGroup ? (msg.senderInitials || msg.senderName || "?")[0] : activeChat.avatar[0]}
                  </div>
                )
              )}
              <div className={`max-w-[75%] sm:max-w-[65%] flex items-end gap-1 ${msg.out ? "flex-row-reverse" : ""}`}>
                <div className="min-w-0">
                  {activeChat.isGroup && !msg.out && msg.senderName && (
                    <p className="mb-0.5 px-1 text-[11px] font-medium truncate" style={{ color: msg.senderColor || "#a855f7" }}>
                      {msg.senderName}
                    </p>
                  )}
                  {msg.removed ? (
                    <div className="msg-bubble-in flex items-center gap-2 px-4 py-2.5 text-white/40">
                      <Icon name="Ban" size={13} />
                      <span className="text-sm italic">Сообщение удалено</span>
                    </div>
                  ) : msg.kind === "circle" && msg.mediaUrl ? (
                    <CircleMessage msg={msg} />
                  ) : (
                  <div className={`${msg.kind === "voice" || msg.kind === "image" || /https?:\/\/.*\.gif/.test(msg.text) ? "p-1" : "px-4 py-2.5"} ${msg.kind === "voice" ? "px-3 py-2" : ""} ${msg.kind === "file" ? "px-3 py-2.5" : ""} ${msg.out ? "msg-bubble-out text-white" : "msg-bubble-in text-white/85"}`}>
                    {msg.replyTo && (
                      <div className={msg.kind === "image" ? "px-2 pt-1" : ""}>
                        <ReplyQuote reply={msg.replyTo} out={msg.out} onJump={jumpTo} />
                      </div>
                    )}
                    {msg.kind === "voice" && msg.mediaUrl ? (
                      <VoiceMessage msg={msg} onTranscribe={onTranscribe} />
                    ) : msg.kind === "image" && msg.mediaUrl ? (
                      <>
                        <ImageAttachment msg={msg} />
                        {msg.text && (
                          <p className="px-3 py-1.5 text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                        )}
                      </>
                    ) : msg.kind === "file" && msg.mediaUrl ? (
                      <>
                        <FileCard msg={msg} out={msg.out} />
                        {msg.text && (
                          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                        )}
                      </>
                    ) : /https?:\/\/.*\.gif/.test(msg.text) ? (
                      <img
                        src={msg.text.match(/https?:\/\/\S+\.gif/)?.[0]}
                        alt="GIF"
                        className="rounded-xl max-w-[220px] max-h-[160px] object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                    )}
                  </div>
                  )}

                  {reactionEntries.length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-1 ${msg.out ? "justify-end" : "justify-start"}`}>
                      {reactionEntries.map(([emoji, users]) => {
                        const mine = currentUserId != null && users.includes(currentUserId);
                        return (
                          <button
                            key={emoji}
                            onClick={() => onToggleReaction?.(msg.id, emoji)}
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-all ${
                              mine
                                ? "bg-purple-500/25 border border-purple-400/40"
                                : "bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1]"
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-[10px] text-white/50">{users.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className={`flex items-center gap-1 mt-1 px-1 ${msg.out ? "justify-end" : "justify-start"}`}>
                    {msg.edited && !msg.removed && <span className="text-[10px] text-white/25">изменено</span>}
                    <span className="text-[10px] text-white/25">{msg.time}</span>
                    {msg.out && !msg.removed && (
                      <Icon name={msg.read ? "CheckCheck" : "Check"} size={12} className={msg.read ? "text-purple-400" : "text-white/25"} />
                    )}
                  </div>
                </div>

                {!msg.removed && (onToggleReaction || onReply || (msg.out && (onEdit || onRemove))) && (
                  <div className="relative shrink-0 self-start flex items-center opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 max-[639px]:opacity-60 transition-opacity">
                    {onReply && (
                      <button
                        onClick={() => onReply(msg)}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-white/30 hover:text-purple-400 hover:bg-white/[0.08] transition-all"
                        title="Ответить"
                      >
                        <Icon name="Reply" size={13} />
                      </button>
                    )}
                    {msg.out && onEdit && (msg.kind === "text" || msg.kind === "image" || msg.kind === "file" || !msg.kind) && !/https?:\/\/.*\.gif/.test(msg.text) && msg.id < 1e12 && (
                      <button
                        onClick={() => onEdit(msg)}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-white/30 hover:text-purple-400 hover:bg-white/[0.08] transition-all"
                        title="Изменить"
                      >
                        <Icon name="Pencil" size={12} />
                      </button>
                    )}
                    {msg.out && onRemove && msg.id < 1e12 && (
                      <button
                        onClick={() => setConfirmRemoveId(msg.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-white/30 hover:text-red-400 hover:bg-white/[0.08] transition-all"
                        title="Удалить"
                      >
                        <Icon name="Trash2" size={12} />
                      </button>
                    )}
                    {onToggleReaction && (
                      <button
                        onClick={() => setReactionPickerFor((v) => (v === msg.id ? null : msg.id))}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-white/30 hover:text-purple-400 hover:bg-white/[0.08] transition-all"
                        title="Добавить реакцию"
                      >
                        <Icon name="SmilePlus" size={13} />
                      </button>
                    )}
                    {onToggleReaction && reactionPickerFor === msg.id && (
                      <div
                        ref={reactionPickerRef}
                        className={`absolute z-20 top-7 flex items-center gap-0.5 rounded-2xl px-1.5 py-1 animate-fade-in ${
                          msg.out ? "right-0" : "left-0"
                        }`}
                        style={{ background: "rgba(14,8,28,0.98)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)" }}
                      >
                        {QUICK_REACTIONS.map((em) => (
                          <button
                            key={em}
                            onClick={() => {
                              onToggleReaction(msg.id, em);
                              setReactionPickerFor(null);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-lg hover:bg-white/[0.08] hover:scale-110 transition-all"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );})
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

      {confirmRemoveId !== null && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          onClick={() => setConfirmRemoveId(null)}
        >
          <div
            className="w-full max-w-xs rounded-3xl overflow-hidden animate-fade-in p-5"
            style={{ background: "rgba(14,8,28,0.98)", border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15">
                <Icon name="Trash2" size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">Удалить сообщение?</p>
                <p className="text-xs text-white/40 mt-1">Оно исчезнет у всех участников чата</p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setConfirmRemoveId(null)}
                className="flex-1 rounded-xl bg-white/[0.06] py-2.5 text-sm text-white/60 hover:bg-white/[0.1] transition-all"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  onRemove?.(confirmRemoveId);
                  setConfirmRemoveId(null);
                }}
                className="flex-1 rounded-xl bg-red-500/20 border border-red-500/30 py-2.5 text-sm text-red-400 hover:bg-red-500/30 transition-all"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
