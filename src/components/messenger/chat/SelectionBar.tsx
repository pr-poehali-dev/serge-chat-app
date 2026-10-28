import { useState } from "react";
import Icon from "@/components/ui/icon";

interface SelectionBarProps {
  count: number;
  ownCount: number;
  onCancel: () => void;
  onForward: () => void;
  onDelete: () => Promise<string | null>;
}

export default function SelectionBar({ count, ownCount, onCancel, onForward, onDelete }: SelectionBarProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const otherCount = count - ownCount;

  const confirmText =
    otherCount === 0
      ? "Выбранные сообщения исчезнут у всех участников чата"
      : ownCount === 0
      ? "Выбранные сообщения пропадут только в вашем чате, у отправителей останутся"
      : "Свои сообщения исчезнут у всех, а чужие пропадут только в вашем чате";

  const doDelete = async () => {
    setBusy(true);
    setError("");
    const err = await onDelete();
    setBusy(false);
    if (err) setError(err);
    else setConfirming(false);
  };

  return (
    <div className="glass-strong safe-bottom border-t border-fg/[0.06] px-3 sm:px-4 py-2.5 sm:py-3">
      {confirming && (
        <div className="mb-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3 animate-fade-in">
          <p className="text-sm font-semibold text-fg/90">Удалить сообщений: {count}?</p>
          <p className="mt-1 text-xs text-fg/55">{confirmText}</p>
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="flex-1 rounded-xl bg-fg/[0.06] py-2 text-sm text-fg/60 hover:bg-fg/[0.1]"
            >
              Отмена
            </button>
            <button
              onClick={doDelete}
              disabled={busy}
              className="flex-1 rounded-xl border border-red-500/30 bg-red-500/20 py-2 text-sm text-red-400 hover:bg-red-500/30 disabled:opacity-50"
            >
              {busy ? "Удаляю..." : "Удалить"}
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          title="Отменить выбор"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-fg/50 hover:bg-fg/[0.08] hover:text-fg/90"
        >
          <Icon name="X" size={18} />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-fg/85">
          {count === 0 ? "Выберите сообщения" : `Выбрано: ${count}`}
        </p>
        <button
          onClick={onForward}
          disabled={count === 0}
          className="flex h-10 items-center gap-2 rounded-2xl bg-purple-500/20 px-4 text-sm font-medium text-purple-200 transition-all hover:bg-purple-500/30 disabled:opacity-40"
        >
          <Icon name="Forward" size={15} />
          <span className="max-[479px]:hidden">Переслать</span>
        </button>
        <button
          onClick={() => {
            setError("");
            setConfirming(true);
          }}
          disabled={count === 0}
          className="flex h-10 items-center gap-2 rounded-2xl bg-red-500/15 px-4 text-sm font-medium text-red-400 transition-all hover:bg-red-500/25 disabled:opacity-40"
        >
          <Icon name="Trash2" size={15} />
          <span className="max-[479px]:hidden">Удалить</span>
        </button>
      </div>
    </div>
  );
}
