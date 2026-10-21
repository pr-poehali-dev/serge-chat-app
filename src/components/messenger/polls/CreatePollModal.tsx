import { useState } from "react";
import Icon from "@/components/ui/icon";

interface CreatePollModalProps {
  onCreate: (question: string, options: string[], multiple: boolean) => Promise<string | null>;
  onClose: () => void;
}

const MAX_OPTIONS = 10;

export default function CreatePollModal({ onCreate, onClose }: CreatePollModalProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const filled = options.map((o) => o.trim()).filter(Boolean);
  const unique = new Set(filled.map((o) => o.toLowerCase())).size;
  const valid = question.trim().length > 0 && unique >= 2 && unique === filled.length;

  const setOption = (i: number, v: string) => setOptions((prev) => prev.map((o, j) => (j === i ? v : o)));

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    const err = await onCreate(question.trim(), filled, multiple);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[94] flex items-center justify-center overlay-safe"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="flex max-h-modal w-full max-w-md flex-col overflow-hidden rounded-3xl animate-fade-in"
        style={{ background: "hsl(var(--popover) / 0.98)", border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-fg/[0.07] px-5 py-4">
          <h2 className="text-sm font-bold text-fg/95">Новый опрос</h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-fg/40 transition-all hover:bg-fg/[0.06] hover:text-fg/80"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-fg/30">Вопрос</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={300}
              rows={2}
              autoFocus
              placeholder="Например: где встречаемся в субботу?"
              className="w-full resize-none rounded-2xl border border-fg/[0.08] bg-fg/[0.06] px-4 py-2.5 text-sm text-fg/85 outline-none placeholder:text-fg/25 focus:border-purple-500/40"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-fg/30">Варианты ответа</label>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={o}
                    onChange={(e) => setOption(i, e.target.value)}
                    maxLength={120}
                    placeholder={`Вариант ${i + 1}`}
                    className="min-w-0 flex-1 rounded-2xl border border-fg/[0.08] bg-fg/[0.06] px-4 py-2.5 text-sm text-fg/85 outline-none placeholder:text-fg/25 focus:border-purple-500/40"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                      aria-label="Убрать вариант"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-fg/30 hover:bg-red-400/10 hover:text-red-400"
                    >
                      <Icon name="X" size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < MAX_OPTIONS && (
              <button
                onClick={() => setOptions((prev) => [...prev, ""])}
                className="mt-2 flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-400/10"
              >
                <Icon name="Plus" size={13} />
                Добавить вариант
              </button>
            )}
            {filled.length > unique && <p className="mt-1 text-xs text-amber-400">Варианты не должны повторяться</p>}
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-fg/[0.05] px-4 py-3">
            <span>
              <span className="block text-sm font-medium text-fg/85">Можно выбрать несколько</span>
              <span className="block text-[11px] text-fg/40">Иначе каждый выбирает один вариант</span>
            </span>
            <input type="checkbox" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} className="h-5 w-5 accent-purple-500" />
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="border-t border-fg/[0.07] px-5 py-4">
          <button
            onClick={submit}
            disabled={!valid || busy}
            className="w-full rounded-2xl gradient-btn py-3 text-sm font-semibold text-white transition-all disabled:opacity-40"
          >
            {busy ? "Отправляем..." : "Создать опрос"}
          </button>
        </div>
      </div>
    </div>
  );
}
