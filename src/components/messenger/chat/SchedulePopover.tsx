import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";

interface SchedulePopoverProps {
  onSchedule: (whenMs: number) => Promise<string | null>;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function SchedulePopover({ onSchedule }: SchedulePopoverProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [minValue, setMinValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = () => {
    if (!open) {
      const now = new Date();
      const next = new Date(now.getTime() + 60 * 60 * 1000);
      next.setMinutes(0, 0, 0);
      setMinValue(toLocalInput(now));
      setValue(toLocalInput(next));
      setError("");
    }
    setOpen((v) => !v);
  };

  const quick = (build: (now: Date) => Date) => setValue(toLocalInput(build(new Date())));

  const submit = async () => {
    const ms = new Date(value).getTime();
    if (!value || Number.isNaN(ms)) {
      setError("Выберите дату и время");
      return;
    }
    if (ms <= Date.now() + 15000) {
      setError("Выберите время в будущем");
      return;
    }
    setBusy(true);
    setError("");
    const err = await onSchedule(ms);
    setBusy(false);
    if (err) setError(err);
    else setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        title="Отправить позже"
        aria-label="Отправить позже"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all ${
          open ? "bg-purple-500/20 text-purple-300" : "text-fg/40 hover:bg-purple-400/[0.08] hover:text-purple-400"
        }`}
      >
        <Icon name="Clock" size={17} />
      </button>
      {open && (
        <div
          className="absolute bottom-14 right-0 z-30 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl p-3 animate-fade-in"
          style={{ background: "hsl(var(--popover) / 0.98)", border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))", backdropFilter: "blur(20px)" }}
        >
          <p className="mb-2 text-xs font-semibold text-fg/80">Отправить позже</p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {[
              { label: "Через час", build: (n: Date) => new Date(n.getTime() + 3600000) },
              { label: "Вечером", build: (n: Date) => { const d = new Date(n); d.setHours(20, 0, 0, 0); if (d <= n) d.setDate(d.getDate() + 1); return d; } },
              { label: "Завтра утром", build: (n: Date) => { const d = new Date(n); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; } },
            ].map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => quick(q.build)}
                className="rounded-lg bg-fg/[0.07] px-2 py-1 text-[11px] text-fg/70 transition-all hover:bg-fg/[0.12]"
              >
                {q.label}
              </button>
            ))}
          </div>
          <input
            type="datetime-local"
            value={value}
            min={minValue}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.06] px-3 py-2 text-sm text-fg/85 outline-none focus:border-purple-500/40"
          />
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl gradient-btn py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Icon name={busy ? "Loader" : "CalendarClock"} size={14} className={busy ? "animate-spin" : ""} />
            Запланировать
          </button>
        </div>
      )}
    </div>
  );
}
