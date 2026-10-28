import { Dispatch, SetStateAction } from "react";
import { blobToBase64 } from "@/components/messenger/media/useRecorder";
import { Chat, Tab, AuthUser } from "@/components/messenger/types";
import { API_CHATS } from "./config";

interface UseChatActionsParams {
  authUser: AuthUser | null;
  authHeaders: () => Record<string, string>;
  reloadChats: () => Promise<void>;
  chats: Chat[];
  setChats: Dispatch<SetStateAction<Chat[]>>;
  setActiveChatId: (id: number | null) => void;
  setActiveTab: (tab: Tab) => void;
  setSendError: Dispatch<SetStateAction<string>>;
}

export function useChatActions({
  authUser,
  authHeaders,
  reloadChats,
  chats,
  setChats,
  setActiveChatId,
  setActiveTab,
  setSendError,
}: UseChatActionsParams) {
  const startChatWithUser = async (userId: number): Promise<string | null> => {
    if (!authUser) return "Не авторизован";
    try {
      const res = await fetch(`${API_CHATS}?action=start-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || "Не удалось начать чат";
      await reloadChats();
      setActiveChatId(data.chat_id);
      setActiveTab("chats");
      return null;
    } catch {
      return "Не удалось связаться с сервером";
    }
  };

  const setChatNotify = (chatId: number, enabled: boolean) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, notifyEnabled: enabled } : c)));
    fetch(`${API_CHATS}?action=set-chat-notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ chat_id: chatId, enabled }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
      })
      .catch(() => {
        setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, notifyEnabled: !enabled } : c)));
        setSendError("Не удалось сохранить настройку уведомлений");
      });
  };

  const setChatBackground = async (chatId: number, bg: string | null): Promise<string | null> => {
    const previous = chats.find((c) => c.id === chatId)?.chatBg ?? null;
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, chatBg: bg } : c)));
    try {
      const res = await fetch(`${API_CHATS}?action=set-chat-bg`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ chat_id: chatId, bg }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить фон");
      return null;
    } catch (e) {
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, chatBg: previous } : c)));
      return e instanceof Error && e.message ? e.message : "Не удалось связаться с сервером";
    }
  };

  const uploadChatBackground = async (chatId: number, file: File): Promise<string | null> => {
    try {
      const imageBase64 = await blobToBase64(file);
      const res = await fetch(`${API_CHATS}?action=set-chat-bg`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ chat_id: chatId, imageBase64, contentType: file.type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error || "Не удалось загрузить фото";
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, chatBg: data.bg } : c)));
      return null;
    } catch {
      return "Не удалось связаться с сервером";
    }
  };

  const togglePinChat = (chatId: number) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;
    const nextPinned = !chat.pinned;
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, pinned: nextPinned } : c)));
    if (chatId < 0) return;
    fetch(`${API_CHATS}?action=pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ chat_id: chatId, pinned: nextPinned }),
    }).catch(() => {
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, pinned: !nextPinned } : c)));
    });
  };

  const postChatFlag = async (action: string, payload: Record<string, unknown>) => {
    try {
      const res = await fetch(`${API_CHATS}?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const setChatArchived = async (chatId: number, archived: boolean): Promise<string | null> => {
    if (chatId < 0) return "Локальный чат нельзя отправить в архив";
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, archived } : c)));
    const ok = await postChatFlag("archive", { chat_id: chatId, archived });
    if (!ok) {
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, archived: !archived } : c)));
      return "Не удалось выполнить действие";
    }
    return null;
  };

  const markChatUnread = async (chatId: number, marked: boolean): Promise<string | null> => {
    if (chatId < 0) return "Локальный чат нельзя отметить";
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, markedUnread: marked, unread: marked ? Math.max(c.unread, 1) : 0 } : c)));
    const ok = await postChatFlag("mark-unread", { chat_id: chatId, marked });
    if (!ok) {
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, markedUnread: !marked } : c)));
      return "Не удалось выполнить действие";
    }
    return null;
  };

  return {
    startChatWithUser,
    setChatNotify,
    setChatBackground,
    uploadChatBackground,
    togglePinChat,
    setChatArchived,
    markChatUnread,
  };
}
