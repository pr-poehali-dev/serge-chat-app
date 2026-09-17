import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Chat, DirectoryUser, BotInfo, AuthUser } from "./types";
import { BOT_CATALOG } from "./BotStore";

const API_CHATS = "https://functions.poehali.dev/50b38462-4054-480e-85a6-3d1d593be5fb";
const API_AUTH = "https://functions.poehali.dev/85275f0b-0f01-4c18-9133-e7e903ca579b";

interface GroupMember {
  id: number;
  displayName: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl?: string | null;
}

interface GroupMembersModalProps {
  chat: Chat;
  authUser: AuthUser | null;
  installedBotUsernames: string[];
  onInstallBot: (bot: BotInfo) => void;
  onClose: () => void;
}

type Tab = "members" | "add-people" | "add-bots";

export default function GroupMembersModal({ chat, authUser, installedBotUsernames, onInstallBot, onClose }: GroupMembersModalProps) {
  const [tab, setTab] = useState<Tab>("members");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const isLocalChat = chat.id < 0;

  const loadMembers = () => {
    if (isLocalChat) {
      setLoadingMembers(false);
      return;
    }
    setLoadingMembers(true);
    fetch(`${API_CHATS}?action=members&chat_id=${chat.id}`)
      .then((r) => r.json())
      .then((data) => setMembers(data.members || []))
      .finally(() => setLoadingMembers(false));
  };

  useEffect(() => {
    loadMembers();
    if (authUser) {
      fetch(`${API_AUTH}?action=users`, { headers: { "X-Session-Id": authUser.sessionId } })
        .then((r) => r.json())
        .then((data) => setDirectory(data.users || []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id]);

  const memberIds = new Set(members.map((m) => m.id));
  const availableUsers = directory.filter(
    (u) => !memberIds.has(u.id) && u.displayName.toLowerCase().includes(search.trim().toLowerCase())
  );

  const filteredBots = BOT_CATALOG.filter(
    (b) => b.name.toLowerCase().includes(search.trim().toLowerCase()) || b.username.toLowerCase().includes(search.trim().toLowerCase())
  );

  const addMember = async (userId: number) => {
    if (isLocalChat) return;
    setAddingId(userId);
    try {
      await fetch(`${API_CHATS}?action=add-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat.id, user_id: userId }),
      });
      loadMembers();
    } finally {
      setAddingId(null);
    }
  };

  const removeMember = async (userId: number) => {
    if (isLocalChat) return;
    setRemovingId(userId);
    try {
      await fetch(`${API_CHATS}?action=remove-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat.id, user_id: userId }),
      });
      loadMembers();
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[93] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[80vh] rounded-3xl overflow-hidden flex flex-col animate-fade-in"
        style={{ background: "rgba(14,8,28,0.98)", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${chat.color}cc, ${chat.color}55)` }}
            >
              {chat.avatar}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white/95">{chat.name}</h2>
              <p className="text-[11px] text-white/35">Участники группы</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.07] shrink-0 px-2">
          {[
            { id: "members" as const, label: "Участники", icon: "Users" },
            { id: "add-people" as const, label: "Добавить людей", icon: "UserPlus" },
            { id: "add-bots" as const, label: "Добавить ботов", icon: "Bot" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSearch(""); }}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium transition-all ${
                tab === t.id ? "text-white border-b-2 border-purple-400" : "text-white/35 hover:text-white/60"
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
        {tab !== "members" && (
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5">
              <Icon name="Search" size={14} className="text-white/30" />
              <input
                className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/25 outline-none"
                placeholder={tab === "add-people" ? "Поиск людей..." : "Поиск ботов..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {tab === "members" && (
            loadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <Icon name="Loader" size={20} className="animate-spin text-white/30" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-center text-xs text-white/25 py-8">Нет данных об участниках</p>
            ) : (
              members.map((m) => (
                <div key={m.id} className="group flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-white/[0.04] transition-all">
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/90 truncate">{m.displayName}</p>
                  </div>
                  {!isLocalChat && authUser?.id !== m.id && (
                    <button
                      onClick={() => removeMember(m.id)}
                      disabled={removingId === m.id}
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-white/20 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
                    >
                      <Icon name={removingId === m.id ? "Loader" : "UserMinus"} size={14} className={removingId === m.id ? "animate-spin" : ""} />
                    </button>
                  )}
                </div>
              ))
            )
          )}

          {tab === "add-people" && (
            availableUsers.length === 0 ? (
              <p className="text-center text-xs text-white/25 py-8">Никого не найдено</p>
            ) : (
              availableUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-white/[0.04] transition-all">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt={u.displayName} className="h-10 w-10 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${u.avatarColor}cc, ${u.avatarColor}55)` }}
                    >
                      {u.avatarInitials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/90 truncate">{u.displayName}</p>
                    <p className="text-xs text-white/35 truncate">@{u.login}</p>
                  </div>
                  <button
                    onClick={() => addMember(u.id)}
                    disabled={isLocalChat || addingId === u.id}
                    className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium gradient-btn text-white transition-all disabled:opacity-40 hover:-translate-y-0.5"
                  >
                    {addingId === u.id ? <Icon name="Loader" size={13} className="animate-spin" /> : "Добавить"}
                  </button>
                </div>
              ))
            )
          )}

          {tab === "add-bots" && (
            filteredBots.map((bot) => {
              const installed = installedBotUsernames.includes(bot.username);
              return (
                <div key={bot.username} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-white/[0.04] transition-all">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg"
                    style={{ background: `${bot.color}22`, border: `1px solid ${bot.color}33` }}
                  >
                    {bot.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/90 truncate">{bot.name}</p>
                    <p className="text-xs text-white/35 truncate">{bot.description}</p>
                  </div>
                  <button
                    onClick={() => !installed && onInstallBot(bot)}
                    disabled={installed}
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                      installed ? "bg-white/[0.06] text-white/30 cursor-default" : "gradient-btn text-white hover:-translate-y-0.5"
                    }`}
                  >
                    {installed ? "Добавлен" : "Добавить"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
