import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { BG_COLORS, BG_PRESETS, resolveBg } from "./chatBackgrounds";

interface ChatBackgroundPickerProps {
  current: string | null;
  isGroup: boolean;
  onSelect: (bg: string | null) => Promise<string | null>;
  onUpload: (file: File) => Promise<string | null>;
  onClose: () => void;
}

const MAX_BYTES = 5 * 1024 * 1024;

export default function ChatBackgroundPicker({ current, isGroup, onSelect, onUpload, onClose }: ChatBackgroundPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setError("");
    const err = await fn();
    setBusy(false);
    if (err) setError(err);
  };

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Подходят только JPG, PNG и WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Файл больше 5 МБ. Выберите поменьше");
      return;
    }
    run(() => onUpload(file));
  };

  const tile = (key: string, value: string, title: string) => {
    const r = resolveBg(value);
    const active = current === value;
    return (
      <button
        key={key}
        disabled={busy}
        onClick={() => run(() => onSelect(value))}
        title={title}
        aria-label={title}
        className={`relative aspect-[3/4] overflow-hidden rounded-xl border transition-all hover:scale-[1.04] disabled:opacity-60 ${
          active ? "border-purple-400 ring-2 ring-purple-400/60" : "border-fg/10"
        }`}
        style={r?.style}
      >
        {active && (
          <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-white">
            <Icon name="Check" size={12} />
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[94] flex items-center justify-center overlay-safe"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="flex max-h-modal w-full max-w-lg flex-col overflow-hidden rounded-3xl animate-fade-in"
        style={{ background: "hsl(var(--popover) / 0.98)", border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-fg/[0.07] px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-fg/95">Фон чата</h2>
            <p className="text-[11px] text-fg/35">{isGroup ? "Виден только вам, у других участников свой" : "Виден только вам, у собеседника свой"}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-fg/40 transition-all hover:bg-fg/[0.06] hover:text-fg/80"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => run(() => onSelect(null))}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all disabled:opacity-60 ${
                !current ? "border-purple-400 bg-purple-500/15 text-foreground" : "border-fg/10 text-fg/60 hover:bg-fg/[0.06]"
              }`}
            >
              <Icon name="RotateCcw" size={13} />
              Стандартный
            </button>
            <button
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-fg/10 px-3 py-2 text-xs font-medium text-fg/70 transition-all hover:bg-fg/[0.06] disabled:opacity-60"
            >
              <Icon name={busy ? "Loader" : "ImagePlus"} size={13} className={busy ? "animate-spin" : ""} />
              Своё фото
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickFile} />
          </div>

          {current?.startsWith("img:") && (
            <div className="flex items-center gap-3 rounded-2xl border border-purple-400/40 bg-purple-500/10 p-2">
              <div className="h-14 w-10 shrink-0 rounded-lg" style={resolveBg(current)?.style} />
              <p className="text-xs text-fg/70">Сейчас стоит ваше фото</p>
            </div>
          )}

          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-fg/30">Шаблоны</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {BG_PRESETS.map((p) => tile(p.id, `preset:${p.id}`, p.title))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-fg/30">Однотонные</p>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  disabled={busy}
                  onClick={() => run(() => onSelect(`color:${c}`))}
                  title={c}
                  aria-label={`Цвет ${c}`}
                  className={`relative aspect-square rounded-xl border transition-all hover:scale-110 disabled:opacity-60 ${
                    current === `color:${c}` ? "border-purple-400 ring-2 ring-purple-400/60" : "border-fg/15"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
