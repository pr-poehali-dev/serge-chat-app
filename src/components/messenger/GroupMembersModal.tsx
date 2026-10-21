import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { Chat, DirectoryUser, BotInfo, AuthUser } from "./types";
import { BOT_CATALOG } from "./BotStore";
import { GroupRole, GroupMember, ConfirmState } from "./groupMembers/types";
import MembersTab from "./groupMembers/MembersTab";
import { AddPeopleTab, AddBotsTab } from "./groupMembers/AddTabs";
import GroupSettingsTab from "./groupMembers/GroupSettingsTab";
import ConfirmDialog from "./groupMembers/ConfirmDialog";

const API_CHATS = "https://functions.poehali.dev/50b38462-4054-480e-85a6-3d1d593be5fb";
const API_AUTH = "https://functions.poehali.dev/85275f0b-0f01-4c18-9133-e7e903ca579b";

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
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
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
            <MembersTab
              loadingMembers={loadingMembers}
              members={members}
              isLocalChat={isLocalChat}
              isOwner={isOwner}
              authUser={authUser}
              onOpenProfile={onOpenProfile}
              menuFor={menuFor}
              setMenuFor={setMenuFor}
              canRemove={canRemove}
              setConfirm={setConfirm}
              removingId={removingId}
              changeRole={changeRole}
            />
          )}

          {tab === "add-people" && (
            <AddPeopleTab
              availableUsers={availableUsers}
              isLocalChat={isLocalChat}
              addingId={addingId}
              addMember={addMember}
            />
          )}

          {tab === "settings" && (
            <GroupSettingsTab
              chat={chat}
              groupAvatar={groupAvatar}
              groupName={groupName}
              setGroupName={setGroupName}
              groupDesc={groupDesc}
              setGroupDesc={setGroupDesc}
              canManage={canManage}
              isLocalChat={isLocalChat}
              busy={busy}
              avatarInputRef={avatarInputRef}
              changeAvatar={changeAvatar}
              removeAvatar={removeAvatar}
              saveInfo={saveInfo}
              setConfirm={setConfirm}
            />
          )}

          {tab === "add-bots" && (
            <AddBotsTab
              filteredBots={filteredBots}
              installedBotUsernames={installedBotUsernames}
              onInstallBot={onInstallBot}
            />
          )}
        </div>

        {error && (
          <div className="border-t border-red-500/20 bg-red-500/10 px-5 py-2.5">
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {confirm && (
          <ConfirmDialog
            confirm={confirm}
            isOwner={isOwner}
            busy={busy}
            setConfirm={setConfirm}
            transferOwner={transferOwner}
            removeMember={removeMember}
            leaveGroup={leaveGroup}
          />
        )}
      </div>
    </div>
  );
}
