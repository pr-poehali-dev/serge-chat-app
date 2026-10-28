import { useCallback, useEffect, useRef, useState } from "react";
import { AuthUser, ScheduleDraft, ScheduledItem } from "@/components/messenger/types";
import { blobToBase64 } from "@/components/messenger/media/useRecorder";
import { API_CHATS } from "./config";

interface Params {
  authUser: AuthUser | null;
  authHeaders: () => Record<string, string>;
  chatId: number | null;
  topicId: number | null;
}

const byTime = (a: ScheduledItem, b: ScheduledItem) => a.sendAtMs - b.sendAtMs || a.id - b.id;

export function useScheduled({ authUser, authHeaders, chatId, topicId }: Params) {
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const chatRef = useRef<number | null>(chatId);
  chatRef.current = chatId;

  const load = useCallback(async () => {
    if (!authUser || !chatId) {
      setItems([]);
      return;
    }
    try {
      const res = await fetch(`${API_CHATS}?action=list-scheduled&chat_id=${chatId}`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (chatRef.current === chatId) setItems(data.items || []);
    } catch {
      return;
    }
  }, [authUser, chatId]);

  useEffect(() => {
    setItems([]);
    load();
  }, [load]);

  useEffect(() => {
    if (items.length === 0) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) load();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [items.length, load]);

  const schedule = async (draft: ScheduleDraft, whenMs: number): Promise<string | null> => {
    if (!chatId) return "Откройте чат";
    const text = draft.text.trim();
    if (draft.kind === "text" && !text) return "Напишите текст сообщения";
    try {
      const payload: Record<string, unknown> = {
        chat_id: chatId,
        topic_id: topicId,
        kind: draft.kind,
        text,
        send_at: new Date(whenMs).toISOString(),
      };
      if (draft.kind !== "text") {
        if (!draft.file) return "Не удалось прочитать файл";
        payload.media = await blobToBase64(draft.file);
        payload.contentType = draft.file.type || "application/octet-stream";
        payload.fileName = draft.file.name;
      }
      const res = await fetch(`${API_CHATS}?action=schedule-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error || "Не удалось запланировать сообщение";
      setItems((prev) => [...prev, data.item as ScheduledItem].sort(byTime));
      return null;
    } catch {
      return "Не удалось связаться с сервером";
    }
  };

  const update = async (id: number, patch: { text?: string; whenMs?: number }): Promise<string | null> => {
    try {
      const body: Record<string, unknown> = { id };
      if (patch.text !== undefined) body.text = patch.text;
      if (patch.whenMs !== undefined) body.send_at = new Date(patch.whenMs).toISOString();
      const res = await fetch(`${API_CHATS}?action=edit-scheduled`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404) load();
        return data.error || "Не удалось сохранить изменения";
      }
      setItems((prev) => prev.map((i) => (i.id === id ? (data.item as ScheduledItem) : i)).sort(byTime));
      return null;
    } catch {
      return "Не удалось связаться с сервером";
    }
  };

  const cancel = async (id: number) => {
    const snapshot = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      const res = await fetch(`${API_CHATS}?action=cancel-scheduled`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ id }),
      });
      if (!res.ok && res.status !== 404) setItems(snapshot);
      if (res.status === 404) load();
    } catch {
      setItems(snapshot);
    }
  };

  return { items, schedule, update, cancel };
}
