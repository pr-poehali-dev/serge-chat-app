import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { Chat, DirectoryUser, BotInfo, AuthUser } from "./types";
import { BOT_CATALOG } from "./BotStore";

const API_CHATS = "https://functions.poehali.dev/50b38462-4054-480e-85a6-3d1d593be5fb";
const API_AUTH = "https://functions.poehali.dev/85275f0b-0f01-4c18-9133-e7e903ca579b";

type GroupRole = "owner" | "admin" | "member";

interface GroupMember {
  id: number;
  displayName: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl?: string | null;
  role?: GroupRole;
  moodEmoji?: string;
  moodText?: string;
}

const ROLE_LABEL: Record<GroupRole, string> = { owner: "Владелец", admin: "Администратор", member: "" };

interface GroupMembersModalProps {
  chat: Chat;
  authUser: AuthUser | null;
  installedBotUsernames: string[];
  onInstallBot: (bot: BotInfo) => void;
  onClose: () => void;
  onGroupChanged?: () => void;
  onLeft?: () => void;
  onOpenProfile?: (userId: number) => void;
}

type Tab = "members" | "add-people" | "add-bots" | "settings";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });

export default function GroupMembersModal({ chat, authUser, installedBotUsernames, onInstallBot, onClose, onGroupChanged, onLeft, onOpenProfile }: GroupMembersModalProps) {
  const [tab, setTab] = useState<Tab>("members");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [myRole, setMyRole] = useState<GroupRole>(chat.myRole || "member");
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "transfer" | "remove" | "leave"; member?: GroupMember } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [groupName, setGroupName] = useState(chat.name);
  const [groupDesc, setGroupDesc] = useState(chat.description || "");
  const [groupAvatar, setGroupAvatar] = useState<string | null>(chat.avatarUrl || null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const canManage = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  const isLocalChat = chat.id < 0;
  const authHeaders: Record<string, string> = authUser ? { "X-Session-Id": authUser.sessionId } : {};

  const loadMembers = () => {
    if (isLocalChat) {
      setLoadingMembers(false);
      return;
    }
    setLoadingMembers(true);
    fetch(`${API_CHATS}?action=members&chat_id=${chat.id}`, { headers: authHeaders })
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.members || []);
        if (data.myRole) setMyRole(data.myRole);
        if (data.group) {
          setGroupName(data.group.name);
          setGroupDesc(data.group.description || "");
          setGroupAvatar(data.group.avatarUrl || null);
        }
      })
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

  const post = async (action: string, payload: Record<string, unknown>): Promise<string | null> => {
    try {
      const res = await fetch(`${API_CHATS}?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      return res.ok ? null : data.error || "Не удалось выполнить действие";
    } catch {
      return "Не удалось связаться с сервером";
    }
  };

  const addMember = async (userId: number) => {
    if (isLocalChat) return;
    setAddingId(userId);
    setError("");
    const err = await post("add-member", { chat_id: chat.id, user_id: userId });
    setAddingId(null);
    if (err) setError(err);
    else loadMembers();
  };

  const removeMember = async (userId: number) => {
    if (isLocalChat) return;
    setRemovingId(userId);
    setError("");
    const err = await post("remove-member", { chat_id: chat.id, user_id: userId });
    setRemovingId(null);
    setConfirm(null);
    if (err) setError(err);
    else loadMembers();
  };

  const changeRole = async (userId: number, role: "admin" | "member") => {
    setMenuFor(null);
    setError("");
    const err = await post("set-role", { chat_id: chat.id, user_id: userId, role });
    if (err) setError(err);
    else loadMembers();
  };

  const transferOwner = async (userId: number) => {
    setBusy(true);
    setError("");
    const err = await post("transfer-owner", { chat_id: chat.id, user_id: userId });
    setBusy(false);
    setConfirm(null);
    if (err) setError(err);
    else {
      loadMembers();
      onGroupChanged?.();
    }
  };

  const leaveGroup = async () => {
    setBusy(true);
    const err = await post("leave-group", { chat_id: chat.id });
    setBusy(false);
    setConfirm(null);
    if (err) setError(err);
    else onLeft?.();
  };

  const saveInfo = async () => {
    const name = groupName.trim();
    if (!name) {
      setError("Название не может быть пустым");
      return;
    }
    setBusy(true);
    setError("");
    const err = await post("update-group", { chat_id: chat.id, name, description: groupDesc.trim() });
    setBusy(false);
    if (err) setError(err);
    else onGroupChanged?.();
  };

  const changeAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Подходят только JPG, PNG и WebP");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Фото больше 3 МБ. Выберите поменьше");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const imageBase64 = await fileToBase64(file);
      const res = await fetch(`${API_CHATS}?action=update-group`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ chat_id: chat.id, imageBase64, contentType: file.type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Не удалось загрузить фото");
      else {
        setGroupAvatar(data.group?.avatarUrl || null);
        onGroupChanged?.();
      }
    } catch {
      setError("Не удалось загрузить фото");
    } finally {
      setBusy(false);
    }
  };

  const removeAvatar = async () => {
    setBusy(true);
    setError("");
    const err = await post("update-group", { chat_id: chat.id, removeAvatar: true });
    setBusy(false);
    if (err) setError(err);
    else {
      setGroupAvatar(null);
      onGroupChanged?.();
    }
  };

  const canRemove = (m: GroupMember) =>
    !isLocalChat && canManage && authUser?.id !== m.id && m.role !== "owner" && (m.role !== "admin" || isOwner);

  return (
    <div
      className="fixed inset-0 z-[93] flex items-center justify-center overlay-safe"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-modal rounded-3xl overflow-hidden flex flex-col animate-fade-in"
        style={{ background: "hsl(var(--popover) / 0.98)", border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-fg/[0.07]">
          <div className="flex items-center gap-2">
            {groupAvatar ? (
              <img src={groupAvatar} alt={groupName} className="h-9 w-9 rounded-xl object-cover" />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${chat.color}cc, ${chat.color}55)` }}
              >
                {chat.avatar}
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold text-fg/95">{groupName}</h2>
              <p className="text-[11px] text-fg/35">{members.length ? `Участников: ${members.length}` : "Участники группы"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-fg/40 hover:text-fg/80 hover:bg-fg/[0.06] transition-all"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {tab === "members" && (
            loadingMembers ? (
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
            )
          )}

          {tab === "add-people" && (
            availableUsers.length === 0 ? (
              <p className="text-center text-xs text-fg/25 py-8">Никого не найдено</p>
            ) : (
              availableUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-fg/[0.04] transition-all">
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
                    <p className="text-sm font-semibold text-fg/90 truncate">{u.displayName}</p>
                    <p className="text-xs text-fg/35 truncate">@{u.login}</p>
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

          {tab === "settings" && (
            <div className="space-y-5 px-2 py-2">
              <div className="flex items-center gap-4">
                {groupAvatar ? (
                  <img src={groupAvatar} alt={groupName} className="h-20 w-20 rounded-3xl object-cover" />
                ) : (
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-3xl text-2xl font-black text-white"
                    style={{ background: `linear-gradient(135deg, ${chat.color}cc, ${chat.color}55)` }}
                  >
                    {chat.avatar}
                  </div>
                )}
                {canManage && !isLocalChat ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={busy}
                      className="flex items-center gap-2 rounded-xl gradient-btn px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                    >
                      <Icon name={busy ? "Loader" : "ImagePlus"} size={13} className={busy ? "animate-spin" : ""} />
                      Сменить фото
                    </button>
                    {groupAvatar && (
                      <button onClick={removeAvatar} disabled={busy} className="text-left text-xs text-fg/45 hover:text-red-400 disabled:opacity-50">
                        Убрать фото
                      </button>
                    )}
                    <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={changeAvatar} />
                  </div>
                ) : (
                  <p className="text-xs text-fg/40">Фото группы меняют владелец и администраторы</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-fg/30">Название</label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  readOnly={!canManage || isLocalChat}
                  maxLength={100}
                  className="w-full rounded-2xl border border-fg/[0.08] bg-fg/[0.06] px-4 py-2.5 text-sm text-fg/85 outline-none focus:border-purple-500/40 read-only:opacity-70"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-fg/30">Описание</label>
                <textarea
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  readOnly={!canManage || isLocalChat}
                  maxLength={300}
                  rows={3}
                  placeholder={canManage ? "О чём эта группа" : "Описания нет"}
                  className="w-full resize-none rounded-2xl border border-fg/[0.08] bg-fg/[0.06] px-4 py-2.5 text-sm text-fg/85 outline-none placeholder:text-fg/25 focus:border-purple-500/40 read-only:opacity-70"
                />
              </div>
              {canManage && !isLocalChat && (
                <button onClick={saveInfo} disabled={busy} className="w-full rounded-2xl gradient-btn py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {busy ? "Сохраняем..." : "Сохранить"}
                </button>
              )}
              {!isLocalChat && (
                <button
                  onClick={() => setConfirm({ kind: "leave" })}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20"
                >
                  <Icon name="LogOut" size={14} />
                  Покинуть группу
                </button>
              )}
            </div>
          )}

          {tab === "add-bots" && (
            filteredBots.map((bot) => {
              const installed = installedBotUsernames.includes(bot.username);
              return (
                <div key={bot.username} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-fg/[0.04] transition-all">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg"
                    style={{ background: `${bot.color}22`, border: `1px solid ${bot.color}33` }}
                  >
                    {bot.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-fg/90 truncate">{bot.name}</p>
                    <p className="text-xs text-fg/35 truncate">{bot.description}</p>
                  </div>
                  <button
                    onClick={() => !installed && onInstallBot(bot)}
                    disabled={installed}
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                      installed ? "bg-fg/[0.06] text-fg/30 cursor-default" : "gradient-btn text-white hover:-translate-y-0.5"
                    }`}
                  >
                    {installed ? "Добавлен" : "Добавить"}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {error && (
          <div className="border-t border-red-500/20 bg-red-500/10 px-5 py-2.5">
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {confirm && (
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
        )}
      </div>
    </div>
  );
}
