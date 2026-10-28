import { useState } from "react";
import Icon from "@/components/ui/icon";
import { ScheduledItem } from "../types";

interface ScheduledListProps {
  items: ScheduledItem[];
  onCancel: (id: number) => void;
}

const formatWhen = (ms: number) =>
  new Date(ms).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function ScheduledList({ items, onCancel }: ScheduledListProps) {
  const [open, setOpen] = useState(true);
  if (items.length === 0) return null;
  return (
    <div className="mb-2 rounded-xl border border-purple-400/20 bg-purple-500/[0.07] animate-fade-in">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <Icon name="Clock" size={13} className="shrink-0 text-purple-300" />
        <span className="flex-1 text-xs font-semibold text-purple-200">Запланировано: {items.length}</span>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={14} className="text-fg/40" />
      </button>
      {open && (
        <ul className="max-h-36 divide-y divide-fg/[0.06] overflow-y-auto border-t border-fg/[0.06]">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 px-3 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-purple-300">{formatWhen(item.sendAtMs)}</p>
                <p className="truncate text-xs text-fg/65">{item.text}</p>
              </div>
              <button
                type="button"
                onClick={() => onCancel(item.id)}
                title="Отменить отправку"
                aria-label="Отменить отправку"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-fg/40 transition-all hover:bg-red-500/15 hover:text-red-400"
              >
                <Icon name="X" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
