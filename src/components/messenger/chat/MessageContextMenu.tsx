import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Message } from "../types";
import { extractGifUrl } from "@/pages/index/config";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

interface MessageContextMenuProps {
  msg: Message;
  x: number;
  y: number;
  pinned: boolean;
  onClose: () => void;
  onReply?: (msg: Message) => void;
  onEdit?: (msg: Message) => void;
  onForward?: (msg: Message) => void;
  onTogglePin?: (msg: Message) => void;
  onToggleReaction?: (messageId: number, emoji: string) => void;
  onStartSelect?: (messageId: number) => void;
  onAskRemove?: (messageId: number) => void;
  onAskDeleteForMe?: (messageId: number) => void;
}

export default function MessageContextMenu({
  msg,
  x,
  y,
  pinned,
  onClose,
  onReply,
  onEdit,
  onForward,
  onTogglePin,
  onToggleReaction,
  onStartSelect,
  onAskRemove,
  onAskDeleteForMe,
}: MessageContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const [copied, setCopied] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    setPos({
      left: Math.max(margin, Math.min(x, window.innerWidth - r.width - margin)),
      top: Math.max(margin, Math.min(y, window.innerHeight - r.height - margin)),
    });
  }, [x, y]);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const outerMenu = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("contextmenu", outerMenu, true);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", onClose);
    window.addEventListener("blur", onClose);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("contextmenu", outerMenu, true);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  const isGif = extractGifUrl(msg.text) !== null;
  const canEdit =
    msg.out && !!onEdit && (msg.kind === "text" || msg.kind === "image" || msg.kind === "file" || !msg.kind) && !isGif && !msg.poll;
  const canCopy = !!msg.text && !msg.poll && (msg.kind === "text" || msg.kind === "image" || msg.kind === "file" || !msg.kind);

  const run = (fn?: () => void) => () => {
    fn?.();
    onClose();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopied(true);
      window.setTimeout(onClose, 600);
    } catch {
      onClose();
    }
  };

  const items: { key: string; icon: string; label: string; danger?: boolean; onClick: () => void }[] = [];
  if (onReply) items.push({ key: "reply", icon: "Reply", label: "Ответить", onClick: run(() => onReply(msg)) });
  if (canCopy) items.push({ key: "copy", icon: copied ? "Check" : "Copy", label: copied ? "Скопировано" : "Копировать текст", onClick: copy });
  if (canEdit) items.push({ key: "edit", icon: "Pencil", label: "Изменить", onClick: run(() => onEdit?.(msg)) });
  if (onForward) items.push({ key: "forward", icon: "Forward", label: "Переслать", onClick: run(() => onForward(msg)) });
  if (onTogglePin)
    items.push({ key: "pin", icon: "Pin", label: pinned ? "Открепить" : "Закрепить", onClick: run(() => onTogglePin(msg)) });
  if (onStartSelect) items.push({ key: "select", icon: "CheckSquare", label: "Выбрать", onClick: run(() => onStartSelect(msg.id)) });
  if (msg.out && onAskRemove)
    items.push({ key: "remove", icon: "Trash2", label: "Удалить у всех", danger: true, onClick: run(() => onAskRemove(msg.id)) });
  if (!msg.out && onAskDeleteForMe)
    items.push({ key: "forme", icon: "EyeOff", label: "Удалить у меня", danger: true, onClick: run(() => onAskDeleteForMe(msg.id)) });

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-[98] w-56 overflow-hidden rounded-2xl animate-fade-in"
      style={{
        left: pos.left,
        top: pos.top,
        background: "hsl(var(--popover) / 0.98)",
        border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))",
        backdropFilter: "blur(20px)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {onToggleReaction && (
        <div className="flex items-center justify-between gap-0.5 border-b border-fg/[0.07] px-1.5 py-1.5">
          {QUICK_REACTIONS.map((em) => (
            <button
              key={em}
              onClick={run(() => onToggleReaction(msg.id, em))}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-lg transition-all hover:scale-110 hover:bg-fg/[0.08]"
            >
              {em}
            </button>
          ))}
        </div>
      )}
      <div className="py-1">
        {items.map((it) => (
          <button
            key={it.key}
            role="menuitem"
            onClick={it.onClick}
            className={`flex w-full items-center gap-3 px-3.5 py-2 text-left text-sm transition-colors hover:bg-fg/[0.07] ${
              it.danger ? "text-red-400" : "text-fg/85"
            }`}
          >
            <Icon name={it.icon} size={15} className="shrink-0" />
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
