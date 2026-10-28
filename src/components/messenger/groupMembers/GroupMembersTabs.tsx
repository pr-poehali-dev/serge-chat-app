import Icon from "@/components/ui/icon";
import { GroupMembersTabId } from "./useGroupMembers";

interface GroupMembersTabsProps {
  tab: GroupMembersTabId;
  setTab: (tab: GroupMembersTabId) => void;
  canManage: boolean;
  isLocalChat: boolean;
  search: string;
  setSearch: (value: string) => void;
  setError: (value: string) => void;
  setMenuFor: (value: number | null) => void;
}

export default function GroupMembersTabs({
  tab,
  setTab,
  canManage,
  isLocalChat,
  search,
  setSearch,
  setError,
  setMenuFor,
}: GroupMembersTabsProps) {
  return (
    <>
      {/* Tabs */}
      <div className="flex border-b border-fg/[0.07] shrink-0 px-2">
        {[
          { id: "members" as const, label: "Участники", icon: "Users" },
          ...(canManage ? [{ id: "add-people" as const, label: "Добавить", icon: "UserPlus" }] : []),
          ...(canManage ? [{ id: "add-bots" as const, label: "Боты", icon: "Bot" }] : []),
          { id: "settings" as const, label: "О группе", icon: "Settings" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSearch(""); setError(""); setMenuFor(null); }}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium transition-all ${
              tab === t.id ? "text-foreground border-b-2 border-purple-400" : "text-fg/35 hover:text-fg/60"
            }`}
          >
            <Icon name={t.icon} size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {isLocalChat && (
        <div className="px-5 py-3 bg-amber-400/[0.06] border-b border-amber-400/10">
          <p className="text-[11px] text-amber-400/80">
            Эта группа создана локально — изменения участников не сохраняются на сервере
          </p>
        </div>
      )}

      {/* Search (for add tabs) */}
      {(tab === "add-people" || tab === "add-bots") && (
        <div className="px-5 py-3 border-b border-fg/[0.06]">
          <div className="flex items-center gap-2 rounded-2xl bg-fg/[0.06] border border-fg/[0.08] px-3 py-2.5">
            <Icon name="Search" size={14} className="text-fg/30" />
            <input
              className="flex-1 bg-transparent text-sm text-fg/80 placeholder:text-fg/25 outline-none"
              placeholder={tab === "add-people" ? "Поиск людей..." : "Поиск ботов..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      )}
    </>
  );
}
