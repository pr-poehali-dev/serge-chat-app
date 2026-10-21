import Icon from "@/components/ui/icon";
import { AuthUser } from "../types";
import { ConfirmState, GroupMember, GroupRole } from "./types";

const ROLE_LABEL: Record<GroupRole, string> = { owner: "Владелец", admin: "Администратор", member: "" };

interface MembersTabProps {
  loadingMembers: boolean;
  members: GroupMember[];
  isLocalChat: boolean;
  isOwner: boolean;
  authUser: AuthUser | null;
  onOpenProfile?: (userId: number) => void;
  menuFor: number | null;
  setMenuFor: (id: number | null) => void;
  canRemove: (m: GroupMember) => boolean;
  setConfirm: (c: ConfirmState | null) => void;
  removingId: number | null;
  changeRole: (userId: number, role: "admin" | "member") => Promise<void>;
}

export default function MembersTab({
  loadingMembers,
  members,
  isLocalChat,
  isOwner,
  authUser,
  onOpenProfile,
  menuFor,
  setMenuFor,
  canRemove,
  setConfirm,
  removingId,
  changeRole,
}: MembersTabProps) {
  return (
    <>
      {loadingMembers ? (
        <div className="flex items-center justify-center py-8">
          <Icon name="Loader" size={20} className="animate-spin text-fg/30" />
        </div>
      ) : members.length === 0 ? (
        <p className="text-center text-xs text-fg/25 py-8">Нет данных об участниках</p>
      ) : (
        members.map((m) => {
          const role = m.role || "member";
          const showMenu = !isLocalChat && isOwner && authUser?.id !== m.id && role !== "owner";
          return (
            <div key={m.id} className="relative group flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-fg/[0.04] transition-all">
              {m.avatarUrl ? (
                <img src={m.avatarUrl} alt={m.displayName} className="h-10 w-10 shrink-0 rounded-2xl object-cover" />
              ) : (
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${m.avatarColor}cc, ${m.avatarColor}55)` }}
                >
                  {m.avatarInitials}
                </div>
              )}
              <div
                className={`flex-1 min-w-0 ${onOpenProfile ? "cursor-pointer" : ""}`}
                onClick={onOpenProfile ? () => onOpenProfile(m.id) : undefined}
                role={onOpenProfile ? "button" : undefined}
                tabIndex={onOpenProfile ? 0 : undefined}
                onKeyDown={onOpenProfile ? (e) => { if (e.key === "Enter") onOpenProfile(m.id); } : undefined}
              >
                <p className="flex items-center gap-1.5 text-sm font-semibold text-fg/90">
                  <span className="truncate">{m.displayName}</span>
                  {m.moodEmoji && <span className="shrink-0 text-base leading-none" title={m.moodText || "Настроение"}>{m.moodEmoji}</span>}
                  {authUser?.id === m.id && <span className="shrink-0 text-xs font-normal text-fg/35">(вы)</span>}
                </p>
                {m.moodText && <p className="truncate text-[11px] text-fg/45">{m.moodText}</p>}
                {role !== "member" && (
                  <p className={`flex items-center gap-1 text-[11px] font-medium ${role === "owner" ? "text-amber-400" : "text-purple-400"}`}>
                    <Icon name={role === "owner" ? "Crown" : "Shield"} size={11} />
                    {ROLE_LABEL[role]}
                  </p>
                )}
              </div>
              {showMenu && (
                <button
                  onClick={() => setMenuFor(menuFor === m.id ? null : m.id)}
                  aria-label="Действия с участником"
                  className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-fg/30 hover:text-fg/80 hover:bg-fg/[0.08] transition-all"
                >
                  <Icon name="MoreVertical" size={16} />
                </button>
              )}
              {!showMenu && canRemove(m) && (
                <button
                  onClick={() => setConfirm({ kind: "remove", member: m })}
                  disabled={removingId === m.id}
                  aria-label="Удалить из группы"
                  className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-fg/30 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
                >
                  <Icon name={removingId === m.id ? "Loader" : "UserMinus"} size={14} className={removingId === m.id ? "animate-spin" : ""} />
                </button>
              )}
              {menuFor === m.id && (
                <div
                  className="absolute right-3 top-12 z-20 w-60 overflow-hidden rounded-2xl animate-fade-in"
                  style={{ background: "hsl(var(--popover))", border: "1px solid rgb(var(--fg) / calc(0.12 * var(--fg-gain)))", boxShadow: "0 12px 40px rgba(0,0,0,0.35)" }}
                >
                  {role === "member" ? (
                    <button onClick={() => changeRole(m.id, "admin")} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-fg/80 hover:bg-fg/[0.06]">
                      <Icon name="Shield" size={14} className="text-purple-400" />
                      Сделать администратором
                    </button>
                  ) : (
                    <button onClick={() => changeRole(m.id, "member")} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-fg/80 hover:bg-fg/[0.06]">
                      <Icon name="ShieldOff" size={14} className="text-fg/50" />
                      Снять права администратора
                    </button>
                  )}
                  <button
                    onClick={() => { setMenuFor(null); setConfirm({ kind: "transfer", member: m }); }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-fg/80 hover:bg-fg/[0.06]"
                  >
                    <Icon name="Crown" size={14} className="text-amber-400" />
                    Передать группу ему
                  </button>
                  <button
                    onClick={() => { setMenuFor(null); setConfirm({ kind: "remove", member: m }); }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-400 hover:bg-red-400/10"
                  >
                    <Icon name="UserMinus" size={14} />
                    Удалить из группы
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}
