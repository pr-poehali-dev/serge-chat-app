import { useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { Chat, ChatFolder } from "../types";

interface ChatActionsMenuProps {
  chat: Chat;
  folders: ChatFolder[];
  x: number;
  y: number;
  onClose: () => void;
  onTogglePin: (chatId: number) => void;
  onMoveToFolder: (chatId: number, folderId: number | null) => void;
  onToggleArchive: (chatId: number, archived: boolean) => void;
  onToggleUnread: (chatId: number, marked: boolean) => void;
  onLeaveGroup: (chat: Chat) => void;
}

export default function ChatActionsMenu({
  chat,
  folders,
  x,
  y,
  onClose,
  onTogglePin,
  onMoveToFolder,
  onToggleArchive,
  onToggleUnread,
  onLeaveGroup,
}: ChatActionsMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    el.style.left = `${Math.max(margin, Math.min(x, window.innerWidth - r.width - margin))}px`;
    el.style.top = `${Math.max(margin, Math.min(y, window.innerHeight - r.height - margin))}px`;
    el.style.visibility = "visible";
  }, [x, y]);

  useEffect(() => {
    const down = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("touchstart", down);
    document.addEventListener("contextmenu", down, true);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("touchstart", down);
      document.removeEventListener("contextmenu", down, true);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  const canFlag = chat.id > 0 && !chat.isBot;
  const hasUnread = chat.unread > 0 || chat.markedUnread;

  const items: { key: string; icon: string; label: string; danger?: boolean; run: () => void }[] = [];
  if (canFlag) {
    items.push({
      key: "unread",
      icon: hasUnread ? "MailOpen" : "Mail",
      label: hasUnread ? "Отметить прочитанным" : "Отметить непрочитанным",
      run: () => onToggleUnread(chat.id, !hasUnread),
    });
  }
  items.push({ key: "pin", icon: "Pin", label: chat.pinned ? "Открепить" : "Закрепить", run: () => onTogglePin(chat.id) });
  if (canFlag) {
    items.push({
      key: "archive",
      icon: chat.archived ? "ArchiveRestore" : "Archive",
      label: chat.archived ? "Вернуть из архива" : "В архив",
      run: () => onToggleArchive(chat.id, !chat.archived),
    });
  }
  if (chat.isGroup) items.push({ key: "leave", icon: "LogOut", label: "Выйти из группы", danger: true, run: () => onLeaveGroup(chat) });

  return (
    <div
      ref={ref}
      className="fixed z-[96] w-60 overflow-hidden rounded-2xl animate-fade-in"
      style={{
        left: x,
        top: y,
        visibility: "hidden",
        background: "hsl(var(--popover) / 0.98)",
        border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))",
        backdropFilter: "blur(20px)",
      }}
    >
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => {
            onClose();
            it.run();
          }}
          className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-all hover:bg-fg/[0.06] ${it.danger ? "text-red-400" : "text-fg/80"}`}
        >
          <Icon name={it.icon} size={15} className="shrink-0" />
          <span className="truncate">{it.label}</span>
        </button>
      ))}
      {canFlag && folders.length > 0 && (
        <div className="border-t border-fg/[0.07]">
          <p className="px-4 pt-2.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-fg/30">Папка</p>
          {[{ id: null as number | null, name: "Без папки" }, ...folders].map((f) => {
            const current = (chat.folderId ?? null) === f.id;
            return (
              <button
                key={String(f.id)}
                onClick={() => {
                  onClose();
                  if (!current) onMoveToFolder(chat.id, f.id);
                }}
                className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm text-fg/75 transition-all hover:bg-fg/[0.06]"
              >
                <span className="truncate">{f.name}</span>
                {current && <Icon name="Check" size={14} className="shrink-0 text-purple-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
