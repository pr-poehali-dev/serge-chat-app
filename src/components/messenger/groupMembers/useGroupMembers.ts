import { useState, useEffect, useRef } from "react";
import { Chat, DirectoryUser, AuthUser } from "../types";
import { BOT_CATALOG } from "../BotStore";
import { GroupRole, GroupMember, ConfirmState } from "./types";
import { API_CHATS, API_AUTH } from "@/pages/index/config";

export type GroupMembersTabId = "members" | "add-people" | "add-bots" | "settings";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });

interface UseGroupMembersParams {
  chat: Chat;
  authUser: AuthUser | null;
  onGroupChanged?: () => void;
  onLeft?: () => void;
}

export function useGroupMembers({ chat, authUser, onGroupChanged, onLeft }: UseGroupMembersParams) {
  const [tab, setTab] = useState<GroupMembersTabId>("members");
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

  return {
    tab,
    setTab,
    members,
    loadingMembers,
    search,
    setSearch,
    addingId,
    removingId,
    menuFor,
    setMenuFor,
    confirm,
    setConfirm,
    busy,
    error,
    setError,
    groupName,
    setGroupName,
    groupDesc,
    setGroupDesc,
    groupAvatar,
    avatarInputRef,
    canManage,
    isOwner,
    isLocalChat,
    availableUsers,
    filteredBots,
    addMember,
    removeMember,
    changeRole,
    transferOwner,
    leaveGroup,
    saveInfo,
    changeAvatar,
    removeAvatar,
    canRemove,
  };
}
