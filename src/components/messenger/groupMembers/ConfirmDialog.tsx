import { ConfirmState } from "./types";

interface ConfirmDialogProps {
  confirm: ConfirmState;
  isOwner: boolean;
  busy: boolean;
  setConfirm: (c: ConfirmState | null) => void;
  transferOwner: (userId: number) => Promise<void>;
  removeMember: (userId: number) => Promise<void>;
  leaveGroup: () => Promise<void>;
}

export default function ConfirmDialog({ confirm, isOwner, busy, setConfirm, transferOwner, removeMember, leaveGroup }: ConfirmDialogProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-5" onClick={() => setConfirm(null)}>
      <div
        className="w-full max-w-xs rounded-3xl p-5 animate-fade-in"
        style={{ background: "hsl(var(--popover))", border: "1px solid rgb(var(--fg) / calc(0.12 * var(--fg-gain)))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-fg/95">
          {confirm.kind === "transfer" ? "Передать группу?" : confirm.kind === "remove" ? "Удалить из группы?" : "Покинуть группу?"}
        </h3>
        <p className="mt-2 text-sm leading-snug text-fg/55">
          {confirm.kind === "transfer"
            ? `${confirm.member?.displayName} станет владельцем, а вы останетесь администратором. Вернуть права сможет только он.`
            : confirm.kind === "remove"
            ? `${confirm.member?.displayName} больше не увидит переписку группы.`
            : isOwner
            ? "Вы владелец: права перейдут старшему администратору или самому давнему участнику."
            : "Вы перестанете получать сообщения этой группы."}
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setConfirm(null)} className="flex-1 rounded-2xl border border-fg/10 py-2.5 text-sm text-fg/70 hover:bg-fg/[0.06]">
            Отмена
          </button>
          <button
            disabled={busy}
            onClick={() => {
              if (confirm.kind === "transfer" && confirm.member) transferOwner(confirm.member.id);
              else if (confirm.kind === "remove" && confirm.member) removeMember(confirm.member.id);
              else leaveGroup();
            }}
            className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${confirm.kind === "transfer" ? "gradient-btn" : "bg-red-500 hover:bg-red-600"}`}
          >
            {confirm.kind === "transfer" ? "Передать" : confirm.kind === "remove" ? "Удалить" : "Покинуть"}
          </button>
        </div>
      </div>
    </div>
  );
}
