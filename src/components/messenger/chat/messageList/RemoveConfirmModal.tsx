import Icon from "@/components/ui/icon";

interface RemoveConfirmModalProps {
  confirmRemoveId: number;
  setConfirmRemoveId: (id: number | null) => void;
  onRemove?: (messageId: number) => void;
}

export default function RemoveConfirmModal({ confirmRemoveId, setConfirmRemoveId, onRemove }: RemoveConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center overlay-safe"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={() => setConfirmRemoveId(null)}
    >
      <div
        className="w-full max-w-xs rounded-3xl overflow-hidden animate-fade-in p-5"
        style={{ background: "hsl(var(--popover) / 0.98)", border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15">
            <Icon name="Trash2" size={20} className="text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-fg/90">Удалить сообщение?</p>
            <p className="text-xs text-fg/40 mt-1">Оно исчезнет у всех участников чата</p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => setConfirmRemoveId(null)}
            className="flex-1 rounded-xl bg-fg/[0.06] py-2.5 text-sm text-fg/60 hover:bg-fg/[0.1] transition-all"
          >
            Отмена
          </button>
          <button
            onClick={() => {
              onRemove?.(confirmRemoveId);
              setConfirmRemoveId(null);
            }}
            className="flex-1 rounded-xl bg-red-500/20 border border-red-500/30 py-2.5 text-sm text-red-400 hover:bg-red-500/30 transition-all"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
