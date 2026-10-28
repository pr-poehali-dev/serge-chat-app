import { useCallback, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { GalleryItem } from "../types";

interface GalleryViewerProps {
  items: GalleryItem[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  onOpenMessage: (item: GalleryItem) => void;
}

export default function GalleryViewer({ items, index, onIndex, onClose, onOpenMessage }: GalleryViewerProps) {
  const item = items[index];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  const prev = useCallback(() => {
    if (index > 0) onIndex(index - 1);
  }, [index, onIndex]);
  const next = useCallback(() => {
    if (index < items.length - 1) onIndex(index + 1);
  }, [index, items.length, onIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-black/90 overlay-safe" onClick={onClose}>
      <div className="flex shrink-0 items-center gap-3 pb-3" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{item.chatName}</p>
          <p className="truncate text-xs text-white/60">
            {item.senderName ? `${item.senderName} · ` : ""}
            {item.time}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenMessage(item)}
          className="flex h-9 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-xs font-medium text-white hover:bg-white/20"
        >
          <Icon name="MessageSquare" size={14} />
          <span className="max-[479px]:hidden">В чат</span>
        </button>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          download={item.fileName || undefined}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
          title="Открыть оригинал"
          aria-label="Открыть оригинал"
        >
          <Icon name="Download" size={16} />
        </a>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
          title="Закрыть"
          aria-label="Закрыть"
        >
          <Icon name="X" size={18} />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {hasPrev && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-0 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            aria-label="Предыдущее"
          >
            <Icon name="ChevronLeft" size={22} />
          </button>
        )}
        {item.type === "video" ? (
          <video
            key={item.messageId}
            src={item.url}
            controls
            autoPlay
            playsInline
            className="max-h-full max-w-full rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img
            key={item.messageId}
            src={item.url}
            alt={item.fileName || "Фото"}
            className="max-h-full max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        {hasNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-0 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            aria-label="Следующее"
          >
            <Icon name="ChevronRight" size={22} />
          </button>
        )}
      </div>

      <div className="shrink-0 pt-3 text-center" onClick={(e) => e.stopPropagation()}>
        {item.caption && <p className="mb-1 break-words text-sm text-white/85">{item.caption}</p>}
        <p className="text-xs text-white/45">
          {index + 1} из {items.length}
        </p>
      </div>
    </div>
  );
}
