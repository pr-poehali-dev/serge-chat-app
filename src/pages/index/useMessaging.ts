import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";
import { RecordedMedia, blobToBase64 } from "@/components/messenger/media/useRecorder";
import { Chat, Message, Tab, AuthUser, NotificationItem, Attachment } from "@/components/messenger/types";
import { API_CHATS, API_SEND, API_TRANSCRIBE } from "./config";

interface UseMessagingParams {
  authUser: AuthUser | null;
  authHeaders: () => Record<string, string>;
  chats: Chat[];
  setChats: Dispatch<SetStateAction<Chat[]>>;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  activeChatId: number | null;
  setActiveChatId: (id: number | null) => void;
  setActiveChatIdRaw: Dispatch<SetStateAction<number | null>>;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isBotChat: boolean;
  isGroupChat: boolean;
  activeTopicId: number | null;
  botMessages: Record<number, Message[]>;
  setBotMessages: Dispatch<SetStateAction<Record<number, Message[]>>>;
  topicMessages: Record<number, Message[]>;
  setTopicMessages: Dispatch<SetStateAction<Record<number, Message[]>>>;
  inputText: string;
  setInputText: Dispatch<SetStateAction<string>>;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  sendBotMessage: () => void;
}

export function useMessaging({
  authUser,
  authHeaders,
  chats,
  setChats,
  messages,
  setMessages,
  activeChatId,
  setActiveChatId,
  setActiveChatIdRaw,
  activeTab,
  setActiveTab,
  isBotChat,
  isGroupChat,
  activeTopicId,
  botMessages,
  setBotMessages,
  topicMessages,
  setTopicMessages,
  inputText,
  setInputText,
  attachments,
  setAttachments,
  sendBotMessage,
}: UseMessagingParams) {
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const reloadChats = async () => {
    if (!authUser) return;
    const res = await fetch(API_CHATS, { headers: authHeaders() });
    const data = await res.json();
    setChats(data.chats || []);
  };

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

  // Load chats (once authenticated)
  useEffect(() => {
    if (!authUser) return;
    setLoadingChats(true);
    fetch(API_CHATS, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        setChats(data.chats || []);
        if (data.chats?.length > 0 && !activeChatId) {
          setActiveChatIdRaw(data.chats[0].id);
        }
      })
      .finally(() => setLoadingChats(false));
  }, [authUser]);

  const togglePinChat = (chatId: number) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;
    const nextPinned = !chat.pinned;
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, pinned: nextPinned } : c)));
    if (chatId < 0) return; // locally created chats have no backend record
    fetch(`${API_CHATS}?action=pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ chat_id: chatId, pinned: nextPinned }),
    }).catch(() => {
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, pinned: !nextPinned } : c)));
    });
  };

  // Automatically mark notifications as read when the bell tab is opened
  useEffect(() => {
    if (activeTab !== "notifications") return;
    setNotifications((prev) => (prev.some((n) => !n.read) ? prev.map((n) => ({ ...n, read: true })) : prev));
  }, [activeTab]);

  // Load messages when chat changes
  useEffect(() => {
    if (!activeChatId || isBotChat || activeChatId < 0 || !authUser) return;
    setLoadingMsgs(true);
    setMessages([]);
    setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, unread: 0 } : c)));
    fetch(`${API_CHATS}?action=messages&chat_id=${activeChatId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []))
      .finally(() => setLoadingMsgs(false));
  }, [activeChatId, isBotChat, authUser]);

  const activeChatIdRef = useRef<number | null>(null);
  const activeTabRef = useRef<Tab>("chats");
  const prevChatsRef = useRef<Record<number, { unread: number; lastMsg: string; time: string }>>({});
  activeChatIdRef.current = activeChatId;
  activeTabRef.current = activeTab;

  // Poll for new messages: refresh chat list, fill the bell, refresh the open chat
  useEffect(() => {
    if (!authUser) return;
    prevChatsRef.current = {};
    let stopped = false;

    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(API_CHATS, { headers: { "X-Session-Id": authUser.sessionId } });
        if (!res.ok || stopped) return;
        const data = await res.json();
        const fresh: Chat[] = data.chats || [];
        const openId = activeChatIdRef.current;
        const firstRun = Object.keys(prevChatsRef.current).length === 0;
        const newNotes: NotificationItem[] = [];
        let openChatChanged = false;

        const normalized = fresh.map((c) => {
          const prev = prevChatsRef.current[c.id];
          const isOpen = c.id === openId;
          if (isOpen && prev && (prev.lastMsg !== c.lastMsg || prev.time !== c.time || c.unread > 0)) {
            openChatChanged = true;
          }
          if (!firstRun && !isOpen && c.unread > (prev?.unread ?? 0)) {
            newNotes.push({
              id: Date.now() + c.id,
              icon: "MessageCircle",
              text: `${c.name}: ${c.lastMsg || "новое сообщение"}`,
              time: c.time || "сейчас",
              color: c.color,
              read: activeTabRef.current === "notifications",
            });
          }
          prevChatsRef.current[c.id] = { unread: c.unread, lastMsg: c.lastMsg, time: c.time };
          return isOpen ? { ...c, unread: 0 } : c;
        });

        setChats((prev) => [...prev.filter((c) => c.id < 0), ...normalized]);
        if (newNotes.length > 0) setNotifications((prev) => [...newNotes, ...prev].slice(0, 50));

        if (openChatChanged && openId && openId > 0) {
          const r = await fetch(`${API_CHATS}?action=messages&chat_id=${openId}`, {
            headers: { "X-Session-Id": authUser.sessionId },
          });
          if (r.ok && !stopped) {
            const d = await r.json();
            setMessages((cur) => {
              const pending = cur.filter((m) => m.id > 1e12);
              return [...(d.messages || []), ...pending];
            });
          }
        }
      } catch {
        return;
      }
    };

    tick();
    const timer = window.setInterval(tick, 5000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [authUser]);

  const sendMedia = async (kind: "voice" | "circle", media: RecordedMedia) => {
    if (!activeChatId || activeChatId < 0 || isBotChat || sending) return;
    setSending(true);
    try {
      const base64 = await blobToBase64(media.blob);
      const res = await fetch(API_SEND, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          chat_id: activeChatId,
          kind,
          media: base64,
          contentType: media.mime,
          duration: media.duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) return;
      setMessages((prev) => [...prev, data]);
      const label = kind === "voice" ? "🎤 Голосовое сообщение" : "⭕ Видеосообщение";
      setChats((prev) =>
        prev.map((c) => (c.id === activeChatId ? { ...c, lastMsg: label, time: data.time } : c))
      );
    } finally {
      setSending(false);
    }
  };

  const transcribeMessage = async (messageId: number): Promise<string | null> => {
    try {
      const res = await fetch(API_TRANSCRIBE, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ message_id: messageId }),
      });
      const data = await res.json();
      if (!res.ok) return null;
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, transcript: data.transcript } : m)));
      return data.transcript as string;
    } catch {
      return null;
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botMessages, topicMessages]);

  const sendMessage = async () => {
    if (isBotChat) {
      sendBotMessage();
      return;
    }
    const hasText = inputText.trim();
    const hasAttachments = attachments.length > 0;
    if ((!hasText && !hasAttachments) || !activeChatId || sending) return;

    const text = hasText
      ? inputText.trim()
      : attachments.map((a) => `📎 ${a.name} (${a.size})`).join("\n");

    const fullText = hasText && hasAttachments
      ? `${text}\n${attachments.map((a) => `📎 ${a.name} (${a.size})`).join("\n")}`
      : text;

    setInputText("");
    setAttachments([]);

    // Optimistic update
    const optimistic: Message = {
      id: Date.now(),
      text: fullText,
      out: true,
      read: false,
      time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      sender_id: 1,
    };

    // Messages inside a group topic are kept fully local
    if (isGroupChat && activeTopicId) {
      setTopicMessages((prev) => ({
        ...prev,
        [activeTopicId]: [...(prev[activeTopicId] || []), optimistic],
      }));
      return;
    }

    setMessages((prev) => [...prev, optimistic]);

    // Locally created chats (e.g. new groups) don't exist in the backend — keep messages local
    if (activeChatId < 0) {
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId ? { ...c, lastMsg: text, time: optimistic.time } : c
        )
      );
      return;
    }

    setSending(true);

    try {
      const res = await fetch(API_SEND, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ chat_id: activeChatId, text }),
      });
      const data = await res.json();
      // Replace optimistic with real
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...data } : m))
      );
      // Update chat last message
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? { ...c, lastMsg: text, time: data.time }
            : c
        )
      );
    } finally {
      setSending(false);
    }
  };

  const toggleReaction = async (messageId: number, emoji: string) => {
    const applyToList = (list: Message[]): Message[] =>
      list.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = { ...(m.reactions || {}) };
        const users = new Set(reactions[emoji] || []);
        const myId = authUser?.id ?? 1;
        if (users.has(myId)) {
          users.delete(myId);
        } else {
          users.add(myId);
        }
        const nextUsers = Array.from(users);
        if (nextUsers.length > 0) {
          reactions[emoji] = nextUsers;
        } else {
          delete reactions[emoji];
        }
        return { ...m, reactions };
      });

    if (isGroupChat && activeTopicId) {
      setTopicMessages((prev) => ({
        ...prev,
        [activeTopicId]: applyToList(prev[activeTopicId] || []),
      }));
      return;
    }
    if (isBotChat) {
      setBotMessages((prev) => ({
        ...prev,
        [activeChatId as number]: applyToList(prev[activeChatId as number] || []),
      }));
      return;
    }

    setMessages((prev) => applyToList(prev));

    if (!activeChatId || activeChatId < 0) return;

    try {
      const res = await fetch(`${API_CHATS}?action=toggle-reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ message_id: messageId, emoji }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions: data.reactions } : m)));
      }
    } catch {
      // Revert on failure
      setMessages((prev) => applyToList(prev));
    }
  };

  return {
    loadingChats,
    loadingMsgs,
    sending,
    notifications,
    messagesEndRef,
    startChatWithUser,
    togglePinChat,
    sendMedia,
    transcribeMessage,
    sendMessage,
    toggleReaction,
  };
}
