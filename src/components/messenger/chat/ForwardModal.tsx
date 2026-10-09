import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Chat, Message } from "../types";
import { replyLabel } from "./ReplyQuote";

interface ForwardModalProps {
  message: Message;
  chats: Chat[];
  currentChatId: number | null;
  onForward: (chatId: number) => Promise<string | null>;
  onClose: () => void;
}

export default function ForwardModal({ message, chats, currentChatId, onForward, onClose }: ForwardModalProps) {
  const [search, setSearch] = useState("");
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [doneId, setDoneId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const available = chats
    .filter((c) => c.id > 0 && !c.isBot)
    .filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()));

  const preview = replyLabel({
    text: message.text || message.fileName || "",
    kind: (message.kind || "text") as "text",
  });

  const handlePick = async (chatId: number) => {
    if (sendingId !== null) return;
    setError("");
    setSendingId(chatId);
    const err = await onForward(chatId);
    setSendingId(null);
    if (err) {
      setError(err);
      return;
    }
    setDoneId(chatId);
    window.setTimeout(onClose, 700);
  };

  return (
    <div
      className="fixed inset-0 z-[96] flex items-end sm:items-center justify-center sm:px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[85dvh] sm:max-h-[80vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col animate-fade-in pb-[env(safe-area-inset-bottom)]"
        style={{ background: "hsl(var(--popover) / 0.98)", border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-fg/[0.07]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-btn">
              <Icon name="Forward" size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-fg/95">Переслать сообщение</h2>
              <p className="text-[11px] text-fg/40 truncate">{preview}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-fg/40 hover:text-fg/80 hover:bg-fg/[0.06] transition-all"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-fg/[0.06]">
          <div className="flex items-center gap-2 rounded-2xl bg-fg/[0.06] border border-fg/[0.08] px-3 py-2.5">
            <Icon name="Search" size={14} className="text-fg/30" />
            <input
              className="flex-1 min-w-0 bg-transparent text-sm text-fg/80 placeholder:text-fg/30 outline-none"
              placeholder="Поиск чата..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {error && <p className="px-5 pt-3 text-xs text-red-400">{error}</p>}

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {available.length === 0 ? (
            <p className="text-center text-xs text-fg/30 py-8">Чаты не найдены</p>
          ) : (
            available.map((c) => {
              const isSending = sendingId === c.id;
              const isDone = doneId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handlePick(c.id)}
                  disabled={sendingId !== null || doneId !== null}
                  className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 min-h-[56px] text-left hover:bg-fg/[0.05] transition-all disabled:opacity-60"
                >
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} alt={c.name} className="h-10 w-10 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${c.color}cc, ${c.color}55)` }}
                    >
                      {c.avatar}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg/90 truncate">{c.name}</p>
                    <p className="text-xs text-fg/35 truncate">
                      {c.id === currentChatId ? "Текущий чат" : c.isGroup ? "Группа" : "Личный чат"}
                    </p>
                  </div>
                  {isSending ? (
                    <Icon name="Loader" size={16} className="shrink-0 animate-spin text-fg/40" />
                  ) : isDone ? (
                    <Icon name="Check" size={16} className="shrink-0 text-emerald-400" />
                  ) : (
                    <Icon name="Send" size={15} className="shrink-0 text-fg/25" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
