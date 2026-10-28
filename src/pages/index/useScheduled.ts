import { useCallback, useEffect, useRef, useState } from "react";
import { AuthUser, ScheduledItem } from "@/components/messenger/types";
import { API_CHATS } from "./config";

interface Params {
  authUser: AuthUser | null;
  authHeaders: () => Record<string, string>;
  chatId: number | null;
  topicId: number | null;
}

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

  const schedule = async (text: string, whenMs: number): Promise<string | null> => {
    if (!chatId) return "Откройте чат";
    const clean = text.trim();
    if (!clean) return "Напишите текст сообщения";
    try {
      const res = await fetch(`${API_CHATS}?action=schedule-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ chat_id: chatId, topic_id: topicId, text: clean, send_at: new Date(whenMs).toISOString() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error || "Не удалось запланировать сообщение";
      setItems((prev) => [...prev, data.item as ScheduledItem].sort((a, b) => a.sendAtMs - b.sendAtMs));
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

  return { items, schedule, cancel };
}
