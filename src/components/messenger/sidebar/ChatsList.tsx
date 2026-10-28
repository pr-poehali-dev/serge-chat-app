import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Chat, ChatFolder } from "../types";
import ChatActionsMenu from "./ChatActionsMenu";

interface ChatsListProps {
  activeChatId: number | null;
  setActiveChatId: (id: number) => void;
  loadingChats: boolean;
  filteredChats: Chat[];
  onRequestLeaveGroup: (chat: Chat) => void;
  onTogglePinChat: (chatId: number) => void;
  folders: ChatFolder[];
  onMoveChatToFolder: (chatId: number, folderId: number | null) => void;
  onToggleArchive: (chatId: number, archived: boolean) => void;
  onToggleUnread: (chatId: number, marked: boolean) => void;
  emptyText?: string;
}

export default function ChatsList({
  activeChatId,
  setActiveChatId,
  loadingChats,
  filteredChats,
  onRequestLeaveGroup,
  onTogglePinChat,
  folders,
  onMoveChatToFolder,
  onToggleArchive,
  onToggleUnread,
  emptyText,
}: ChatsListProps) {
  const [menu, setMenu] = useState<{ chat: Chat; x: number; y: number } | null>(null);
  const holdRef = useRef<{ timer: number; x: number; y: number } | null>(null);
  const cancelHold = () => {
    if (holdRef.current) {
      window.clearTimeout(holdRef.current.timer);
      holdRef.current = null;
    }
  };
  const startHold = (chat: Chat, e: React.TouchEvent) => {
    const t = e.touches[0];
    cancelHold();
    holdRef.current = {
      x: t.clientX,
      y: t.clientY,
      timer: window.setTimeout(() => {
        holdRef.current = null;
        setMenu({ chat, x: t.clientX, y: t.clientY });
      }, 500),
    };
  };
  const moveHold = (e: React.TouchEvent) => {
    const h = holdRef.current;
    if (!h) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - h.x) > 10 || Math.abs(t.clientY - h.y) > 10) cancelHold();
  };
  const sortedChats = [...filteredChats].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <div className="space-y-1">
      {!loadingChats && sortedChats.length === 0 && emptyText && (
        <p className="px-3 py-8 text-center text-xs text-fg/35">{emptyText}</p>
      )}
      {loadingChats ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-2xl">
            <div className="h-11 w-11 rounded-2xl bg-fg/[0.06] animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded-full bg-fg/[0.06] animate-pulse" />
              <div className="h-2.5 w-1/2 rounded-full bg-fg/[0.04] animate-pulse" />
            </div>
          </div>
        ))
      ) : (
        sortedChats.map((chat, i) => (
          <div
            key={chat.id}
            className={`group relative w-full flex items-center gap-3 rounded-2xl px-3 py-3 transition-all animate-fade-in ${
              activeChatId === chat.id
                ? "bg-fg/[0.08] border border-fg/[0.08]"
                : "hover:bg-fg/[0.04]"
            } ${chat.pinned ? "bg-fg/[0.03]" : ""}`}
            style={{ animationDelay: `${i * 40}ms` }}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ chat, x: e.clientX, y: e.clientY });
            }}
            onTouchStart={(e) => startHold(chat, e)}
            onTouchMove={moveHold}
            onTouchEnd={cancelHold}
            onTouchCancel={cancelHold}
          >
            <button
              onClick={() => setActiveChatId(chat.id)}
              className="flex flex-1 items-center gap-3 min-w-0 text-left"
            >
              <div className="relative shrink-0">
                {chat.avatarUrl ? (
                  <img src={chat.avatarUrl} alt={chat.name} className="h-11 w-11 rounded-2xl object-cover shadow-lg" />
                ) : (
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${chat.color}cc, ${chat.color}66)`, border: `1px solid ${chat.color}33` }}
                  >
                    {chat.avatar}
                  </div>
                )}
                {chat.online && !chat.isGroup && (
                  <span className="online-pulse absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-background" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 min-w-0">
                    {chat.pinned && <Icon name="Pin" size={11} className="text-amber-400 fill-amber-400 shrink-0" />}
                    <span className="text-sm font-semibold text-fg/90 truncate">{chat.name}</span>
                  </span>
                  <span className="text-[11px] text-fg/30 ml-2 shrink-0">{chat.time}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  {chat.typing && !chat.isGroup ? (
                    <span className="text-xs text-purple-400 truncate">печатает…</span>
                  ) : (
                    <span className="text-xs text-fg/40 truncate">{chat.lastMsg}</span>
                  )}
                  {chat.unread > 0 && (
                    <span className="ml-2 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full gradient-btn text-[10px] font-bold text-white px-1">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                setMenu({ chat, x: r.right - 240, y: r.bottom + 4 });
              }}
              title="Действия с чатом"
              aria-label="Действия с чатом"
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-fg/20 opacity-0 group-hover:opacity-100 hover:text-fg/70 hover:bg-fg/[0.08] transition-all"
            >
              <Icon name="MoreHorizontal" size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePinChat(chat.id); }}
              title={chat.pinned ? "Открепить чат" : "Закрепить чат"}
              className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                chat.pinned
                  ? "text-amber-400 opacity-100"
                  : "text-fg/20 opacity-0 group-hover:opacity-100 hover:text-amber-400 hover:bg-amber-400/10"
              }`}
            >
              <Icon name="Pin" size={14} className={chat.pinned ? "fill-amber-400" : ""} />
            </button>
          </div>
        ))
      )}
      {menu && (
        <ChatActionsMenu
          chat={menu.chat}
          folders={folders}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onTogglePin={onTogglePinChat}
          onMoveToFolder={onMoveChatToFolder}
          onToggleArchive={onToggleArchive}
          onToggleUnread={onToggleUnread}
          onLeaveGroup={onRequestLeaveGroup}
        />
      )}
    </div>
  );
}
