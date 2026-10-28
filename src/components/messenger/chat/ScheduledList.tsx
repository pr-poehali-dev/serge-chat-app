import { useState } from "react";
import Icon from "@/components/ui/icon";
import { ScheduledItem } from "../types";
import { extractStickerPath } from "../stickers/stickerCatalog";

interface ScheduledListProps {
  items: ScheduledItem[];
  onCancel: (id: number) => void;
  onUpdate: (id: number, patch: { text?: string; whenMs?: number }) => Promise<string | null>;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const formatWhen = (ms: number) =>
  new Date(ms).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Preview({ item }: { item: ScheduledItem }) {
  const sticker = item.kind === "text" || !item.kind ? extractStickerPath(item.text) : null;
  if (sticker) {
    return (
      <span className="flex items-center gap-2">
        <img src={sticker} alt="" className="h-7 w-7 object-contain" draggable={false} />
        <span className="text-xs text-fg/65">Стикер</span>
      </span>
    );
  }
  if (item.kind === "image") {
    return (
      <span className="flex min-w-0 items-center gap-2">
        {item.mediaUrl && <img src={item.mediaUrl} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" />}
        <span className="truncate text-xs text-fg/65">{item.text || "Фото"}</span>
      </span>
    );
  }
  if (item.kind === "file") {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <Icon name="Paperclip" size={13} className="shrink-0 text-fg/45" />
        <span className="truncate text-xs text-fg/65">
          {item.fileName || "Файл"}
          {item.text ? ` · ${item.text}` : ""}
        </span>
      </span>
    );
  }
  return <p className="truncate text-xs text-fg/65">{item.text}</p>;
}

function EditRow({ item, onUpdate, onDone }: { item: ScheduledItem; onUpdate: ScheduledListProps["onUpdate"]; onDone: () => void }) {
  const isText = item.kind === "text" || !item.kind;
  const canEditText = !(isText && !!extractStickerPath(item.text));
  const [text, setText] = useState(item.text);
  const [when, setWhen] = useState(toLocalInput(item.sendAtMs));
  const [minValue] = useState(() => toLocalInput(Date.now()));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const ms = new Date(when).getTime();
    if (!when || Number.isNaN(ms)) {
      setError("Выберите дату и время");
      return;
    }
    if (ms <= Date.now() + 15000) {
      setError("Выберите время в будущем");
      return;
    }
    if (isText && canEditText && !text.trim()) {
      setError("Текст не может быть пустым");
      return;
    }
    const patch: { text?: string; whenMs?: number } = {};
    if (canEditText && text.trim() !== item.text) patch.text = text.trim();
    if (ms !== item.sendAtMs) patch.whenMs = ms;
    if (Object.keys(patch).length === 0) {
      onDone();
      return;
    }
    setBusy(true);
    setError("");
    const err = await onUpdate(item.id, patch);
    setBusy(false);
    if (err) setError(err);
    else onDone();
  };

  return (
    <div className="space-y-2 px-3 py-2.5 animate-fade-in">
      {canEditText && (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={4000}
          placeholder={isText ? "Текст сообщения" : "Подпись"}
          className="w-full resize-none rounded-xl border border-fg/[0.08] bg-fg/[0.06] px-3 py-2 text-sm text-fg/85 outline-none focus:border-purple-500/40"
        />
      )}
      <input
        type="datetime-local"
        value={when}
        min={minValue}
        onChange={(e) => setWhen(e.target.value)}
        className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.06] px-3 py-2 text-sm text-fg/85 outline-none focus:border-purple-500/40"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onDone} disabled={busy} className="flex-1 rounded-xl bg-fg/[0.06] py-1.5 text-xs text-fg/60 hover:bg-fg/[0.1]">
          Отмена
        </button>
        <button type="button" onClick={save} disabled={busy} className="flex-1 rounded-xl gradient-btn py-1.5 text-xs font-medium text-white disabled:opacity-50">
          {busy ? "Сохраняю..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}

export default function ScheduledList({ items, onCancel, onUpdate }: ScheduledListProps) {
  const [open, setOpen] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  if (items.length === 0) return null;
  return (
    <div className="mb-2 rounded-xl border border-purple-400/20 bg-purple-500/[0.07] animate-fade-in">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-3 py-2 text-left">
        <Icon name="Clock" size={13} className="shrink-0 text-purple-300" />
        <span className="flex-1 text-xs font-semibold text-purple-200">Запланировано: {items.length}</span>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={14} className="text-fg/40" />
      </button>
      {open && (
        <ul className="max-h-64 divide-y divide-fg/[0.06] overflow-y-auto border-t border-fg/[0.06]">
          {items.map((item) =>
            editingId === item.id ? (
              <li key={item.id}>
                <EditRow item={item} onUpdate={onUpdate} onDone={() => setEditingId(null)} />
              </li>
            ) : (
              <li key={item.id} className="flex items-center gap-1 px-3 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-purple-300">{formatWhen(item.sendAtMs)}</p>
                  <Preview item={item} />
                </div>
                <button
                  type="button"
                  onClick={() => setEditingId(item.id)}
                  title="Изменить текст и время"
                  aria-label="Изменить"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-fg/40 transition-all hover:bg-purple-500/15 hover:text-purple-300"
                >
                  <Icon name="Pencil" size={13} />
                </button>
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
            )
          )}
        </ul>
      )}
    </div>
  );
}
