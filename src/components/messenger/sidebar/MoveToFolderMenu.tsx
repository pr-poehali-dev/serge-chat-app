import { useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { Chat, ChatFolder } from "../types";

interface MoveToFolderMenuProps {
  chat: Chat;
  folders: ChatFolder[];
  onMove: (chatId: number, folderId: number | null) => void;
  onClose: () => void;
}

export default function MoveToFolderMenu({ chat, folders, onMove, onClose }: MoveToFolderMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("touchstart", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("touchstart", down);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const options: { id: number | null; label: string }[] = [{ id: null, label: "Без папки" }, ...folders.map((f) => ({ id: f.id, label: f.name }))];

  return (
    <div
      ref={ref}
      className="absolute right-2 top-12 z-30 w-52 overflow-hidden rounded-2xl animate-fade-in"
      style={{ background: "hsl(var(--popover) / 0.98)", border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))", backdropFilter: "blur(20px)" }}
    >
      <p className="px-3 pt-2.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-fg/30">Переместить в папку</p>
      {folders.length === 0 ? (
        <p className="px-3 pb-3 pt-1 text-xs text-fg/45">Сначала создайте папку кнопкой «+» над списком чатов.</p>
      ) : (
        options.map((o) => {
          const current = (chat.folderId ?? null) === o.id;
          return (
            <button
              key={String(o.id)}
              onClick={() => {
                if (!current) onMove(chat.id, o.id);
                onClose();
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-fg/80 hover:bg-fg/[0.06] transition-all"
            >
              <span className="truncate">{o.label}</span>
              {current && <Icon name="Check" size={14} className="shrink-0 text-purple-400" />}
            </button>
          );
        })
      )}
    </div>
  );
}
