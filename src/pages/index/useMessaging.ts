import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";
import { RecordedMedia, blobToBase64 } from "@/components/messenger/media/useRecorder";
import { Chat, Message, PinnedMessage, ReplyPreview, Tab, AuthUser, NotificationItem, Attachment } from "@/components/messenger/types";
import { API_CHATS, API_SEND, API_TRANSCRIBE } from "./config";

const POLL_INTERVAL_MS = 3000;
const TYPING_PING_MS = 3000;

interface UseMessagingParams {
  authUser: AuthUser | null;
  authHeaders: () => Record<string, string>;
  reloadChats: () => Promise<void>;
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
  setActiveTopicId: (id: number | null) => void;
  botMessages: Record<number, Message[]>;
  setBotMessages: Dispatch<SetStateAction<Record<number, Message[]>>>;
  inputText: string;
  setInputText: Dispatch<SetStateAction<string>>;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  sendBotMessage: () => void;
}

export function useMessaging({
  authUser,
  authHeaders,
  reloadChats,
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
  setActiveTopicId,
  botMessages,
  setBotMessages,
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
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [sendError, setSendError] = useState("");
  const [jumpRequest, setJumpRequest] = useState<{ id: number; nonce: number } | null>(null);
  const pendingJumpRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (chatId < 0) return;
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

  const messagesUrl = (chatId: number, topicId: number | null) =>
    `${API_CHATS}?action=messages&chat_id=${chatId}${topicId ? `&topic_id=${topicId}` : ""}`;

  // Load messages when chat or topic changes
  useEffect(() => {
    if (!activeChatId || isBotChat || activeChatId < 0 || !authUser) return;
    let cancelled = false;
    setLoadingMsgs(true);
    setMessages([]);
    setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, unread: 0 } : c)));
    fetch(messagesUrl(activeChatId, activeTopicId), { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMessages(data.messages || []);
      })
      .finally(() => {
        if (!cancelled) setLoadingMsgs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeChatId, activeTopicId, isBotChat, authUser]);

  const activeChatIdRef = useRef<number | null>(null);
  const activeTopicIdRef = useRef<number | null>(null);
  const activeTabRef = useRef<Tab>("chats");
  const isBotChatRef = useRef(false);
  const prevChatsRef = useRef<Record<number, { unread: number; lastMsg: string; time: string }>>({});
  const lastMessagesSigRef = useRef("");
  activeChatIdRef.current = activeChatId;
  activeTopicIdRef.current = activeTopicId;
  activeTabRef.current = activeTab;
  isBotChatRef.current = isBotChat;

  // Poll: refresh chat list (statuses, typing, unread), fill the bell, refresh the open chat
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

        const normalized = fresh.map((c) => {
          const prev = prevChatsRef.current[c.id];
          const isOpen = c.id === openId;
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

        setChats(normalized);
        if (newNotes.length > 0) setNotifications((prev) => [...newNotes, ...prev].slice(0, 50));

        if (openId && openId > 0 && !isBotChatRef.current) {
          const topicId = activeTopicIdRef.current;
          const r = await fetch(messagesUrl(openId, topicId), {
            headers: { "X-Session-Id": authUser.sessionId },
          });
          if (r.ok && !stopped && openId === activeChatIdRef.current && topicId === activeTopicIdRef.current) {
            const d = await r.json();
            const fetched: Message[] = d.messages || [];
            const sig = JSON.stringify(fetched);
            if (sig !== lastMessagesSigRef.current) {
              lastMessagesSigRef.current = sig;
              setMessages((cur) => {
                const pending = cur.filter((m) => m.id > 1e12);
                return [...fetched, ...pending];
              });
            }
          }
        }
      } catch {
        return;
      }
    };

    tick();
    const timer = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [authUser]);

  useEffect(() => {
    lastMessagesSigRef.current = "";
    setReplyTo(null);
    setEditingMessage(null);
    setSendError("");
  }, [activeChatId, activeTopicId]);

  useEffect(() => {
    if (!sendError) return;
    const t = window.setTimeout(() => setSendError(""), 5000);
    return () => window.clearTimeout(t);
  }, [sendError]);

  // Tell the server we are typing (direct chats only)
  const lastTypingPingRef = useRef(0);
  useEffect(() => {
    if (!authUser || !activeChatId || activeChatId < 0 || isBotChat || isGroupChat) return;
    if (!inputText.trim() || editingMessage) return;
    const now = Date.now();
    if (now - lastTypingPingRef.current < TYPING_PING_MS) return;
    lastTypingPingRef.current = now;
    fetch(`${API_CHATS}?action=typing`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ chat_id: activeChatId }),
    }).catch(() => undefined);
  }, [inputText, activeChatId, isBotChat, isGroupChat, authUser]);

  const sendMedia = async (kind: "voice" | "circle", media: RecordedMedia) => {
    if (!activeChatId || activeChatId < 0 || isBotChat || sending) return;
    setSending(true);
    setSendError("");
    try {
      const base64 = await blobToBase64(media.blob);
      const res = await fetch(API_SEND, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          chat_id: activeChatId,
          topic_id: activeTopicId,
          kind,
          media: base64,
          contentType: media.mime,
          duration: media.duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error || "Не удалось отправить сообщение");
        return;
      }
      setMessages((prev) => [...prev, data]);
      const label = kind === "voice" ? "🎤 Голосовое сообщение" : "⭕ Видеосообщение";
      setChats((prev) =>
        prev.map((c) => (c.id === activeChatId ? { ...c, lastMsg: label, time: data.time } : c))
      );
    } catch {
      setSendError("Не удалось связаться с сервером");
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
  }, [messages, botMessages]);

  const sendMessage = async () => {
    if (isBotChat) {
      sendBotMessage();
      return;
    }
    const hasText = inputText.trim();
    const hasAttachments = attachments.length > 0;
    if ((!hasText && !hasAttachments) || !activeChatId || sending) return;

    if (editingMessage) {
      await submitEdit(inputText.trim());
      return;
    }

    const toSend = attachments;
    const caption = inputText.trim();
    const replyTarget = replyTo;

    setInputText("");
    setAttachments([]);
    setReplyTo(null);
    setSendError("");
    setSending(true);

    const nowTime = () => new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const replyPreview = replyTarget
      ? {
          id: replyTarget.id,
          text: replyTarget.text,
          kind: (replyTarget.kind || "text") as ReplyPreview["kind"],
          senderName: replyTarget.out ? "Вы" : replyTarget.senderName || chats.find((c) => c.id === activeChatId)?.name,
        }
      : null;

    const post = async (payload: Record<string, unknown>, optimistic: Message) => {
      setMessages((prev) => [...prev, optimistic]);
      try {
        const res = await fetch(API_SEND, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            chat_id: activeChatId,
            topic_id: activeTopicId,
            reply_to_id: replyTarget?.id ?? null,
            ...payload,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          setSendError(data.error || "Не удалось отправить сообщение");
          return false;
        }
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? { ...data } : m)));
        return data as Message;
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setSendError("Не удалось связаться с сервером");
        return false;
      }
    };

    try {
      let lastLabel = caption;
      let lastTime = nowTime();

      if (toSend.length === 0) {
        const sent = await post(
          { text: caption },
          {
            id: Date.now(),
            text: caption,
            out: true,
            read: false,
            time: lastTime,
            sender_id: authUser?.id ?? 1,
            replyTo: replyPreview,
          }
        );
        if (sent) lastTime = sent.time;
        else return;
      } else {
        for (let i = 0; i < toSend.length; i++) {
          const att = toSend[i];
          const isImage = att.type.startsWith("image/");
          const kind = isImage ? "image" : "file";
          const base64 = att.file ? await blobToBase64(att.file) : "";
          const text = i === 0 ? caption : "";
          const sent = await post(
            { kind, media: base64, contentType: att.type || "application/octet-stream", fileName: att.name, text },
            {
              id: Date.now() + i,
              text,
              out: true,
              read: false,
              time: nowTime(),
              sender_id: authUser?.id ?? 1,
              kind,
              mediaUrl: att.file && isImage ? URL.createObjectURL(att.file) : null,
              fileName: att.name,
              fileSize: att.file?.size ?? null,
              replyTo: i === 0 ? replyPreview : null,
            }
          );
          if (!sent) return;
          lastTime = sent.time;
          lastLabel = isImage ? "🖼 Фото" : `📎 ${att.name}`;
        }
      }

      setChats((prev) =>
        prev.map((c) => (c.id === activeChatId ? { ...c, lastMsg: lastLabel || caption, time: lastTime } : c))
      );
    } finally {
      setSending(false);
    }
  };

  const pinMessage = async (messageId: number | null) => {
    if (!activeChatId || activeChatId < 0) return;
    const chatId = activeChatId;
    const previous = chats.find((c) => c.id === chatId)?.pinnedMessage ?? null;
    const target = messageId ? messages.find((m) => m.id === messageId) : null;

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              pinnedMessage:
                messageId && target
                  ? {
                      id: target.id,
                      text: target.text,
                      kind: (target.kind || "text") as PinnedMessage["kind"],
                      fileName: target.fileName,
                      topicId: activeTopicId,
                      senderName: target.out ? "Вы" : target.senderName || c.name,
                    }
                  : null,
            }
          : c
      )
    );

    try {
      const res = await fetch(`${API_CHATS}?action=pin-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
      });
      if (!res.ok) {
        setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, pinnedMessage: previous } : c)));
        setSendError("Не удалось закрепить сообщение");
      }
    } catch {
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, pinnedMessage: previous } : c)));
      setSendError("Не удалось связаться с сервером");
    }
  };

  const openPinned = (pinned: PinnedMessage) => {
    const targetTopic = pinned.topicId ?? null;
    if (targetTopic !== activeTopicId) {
      pendingJumpRef.current = pinned.id;
      setActiveTopicId(targetTopic);
      return;
    }
    setJumpRequest({ id: pinned.id, nonce: Date.now() });
  };

  useEffect(() => {
    if (pendingJumpRef.current == null || loadingMsgs) return;
    const id = pendingJumpRef.current;
    if (messages.some((m) => m.id === id)) {
      pendingJumpRef.current = null;
      setJumpRequest({ id, nonce: Date.now() });
    }
  }, [messages, loadingMsgs]);

  const startReply = (msg: Message) => {
    setEditingMessage(null);
    setReplyTo(msg);
  };

  const startEdit = (msg: Message) => {
    setReplyTo(null);
    setEditingMessage(msg);
    setInputText(msg.text);
  };

  const cancelComposerContext = () => {
    if (editingMessage) setInputText("");
    setReplyTo(null);
    setEditingMessage(null);
  };

  const submitEdit = async (text: string) => {
    if (!editingMessage || !text) return;
    const target = editingMessage;
    setSending(true);
    try {
      const res = await fetch(`${API_CHATS}?action=edit-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ message_id: target.id, text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error || "Не удалось изменить сообщение");
        return;
      }
      setMessages((prev) => prev.map((m) => (m.id === target.id ? { ...m, text: data.text, edited: true } : m)));
      setEditingMessage(null);
      setInputText("");
    } catch {
      setSendError("Не удалось связаться с сервером");
    } finally {
      setSending(false);
    }
  };

  const removeMessage = async (messageId: number) => {
    const snapshot = messages;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, removed: true, text: "", kind: "text", mediaUrl: null, fileName: null, reactions: {} }
          : m
      )
    );
    if (replyTo?.id === messageId) setReplyTo(null);
    if (editingMessage?.id === messageId) {
      setEditingMessage(null);
      setInputText("");
    }
    try {
      const res = await fetch(`${API_CHATS}?action=remove-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ message_id: messageId }),
      });
      if (!res.ok) {
        setMessages(snapshot);
        setSendError("Не удалось удалить сообщение");
      }
    } catch {
      setMessages(snapshot);
      setSendError("Не удалось связаться с сервером");
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
    replyTo,
    editingMessage,
    sendError,
    startReply,
    startEdit,
    cancelComposerContext,
    removeMessage,
    pinMessage,
    openPinned,
    jumpRequest,
  };
}
