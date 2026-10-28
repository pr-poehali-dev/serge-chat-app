import { Dispatch, SetStateAction, useState } from "react";
import { Chat, ChatFolder } from "@/components/messenger/types";
import { API_CHATS } from "./config";

interface UseChatFoldersParams {
  authHeaders: () => Record<string, string>;
  setChats: Dispatch<SetStateAction<Chat[]>>;
}

export function useChatFolders({ authHeaders, setChats }: UseChatFoldersParams) {
  const [folders, setFolders] = useState<ChatFolder[]>([]);

  const post = async (action: string, payload: Record<string, unknown>) => {
    try {
      const res = await fetch(`${API_CHATS}?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, data, error: res.ok ? null : ((data.error as string) || "Не удалось выполнить действие") };
    } catch {
      return { ok: false, data: {}, error: "Не удалось связаться с сервером" };
    }
  };

  const createFolder = async (name: string): Promise<string | null> => {
    const r = await post("folder-create", { name });
    if (!r.ok) return r.error;
    setFolders((prev) => [...prev, r.data.folder as ChatFolder]);
    return null;
  };

  const renameFolder = async (folderId: number, name: string): Promise<string | null> => {
    const r = await post("folder-rename", { folder_id: folderId, name });
    if (!r.ok) return r.error;
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, name: name.trim().slice(0, 40) } : f)));
    return null;
  };

  const deleteFolder = async (folderId: number): Promise<string | null> => {
    const r = await post("folder-delete", { folder_id: folderId });
    if (!r.ok) return r.error;
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setChats((prev) => prev.map((c) => (c.folderId === folderId ? { ...c, folderId: null } : c)));
    return null;
  };

  const moveChatToFolder = async (chatId: number, folderId: number | null): Promise<string | null> => {
    if (chatId < 0) return "Локальный чат нельзя перенести в папку";
    let previous: number | null | undefined;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatId) return c;
        previous = c.folderId;
        return { ...c, folderId };
      })
    );
    const r = await post("chat-folder", { chat_id: chatId, folder_id: folderId });
    if (!r.ok) {
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, folderId: previous ?? null } : c)));
      return r.error;
    }
    return null;
  };

  return { folders, setFolders, createFolder, renameFolder, deleteFolder, moveChatToFolder };
}
