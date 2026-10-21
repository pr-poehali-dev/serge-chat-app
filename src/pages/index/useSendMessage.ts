import { useState, useEffect, useRef, Dispatch, SetStateAction, MutableRefObject } from "react";
import { RecordedMedia, blobToBase64 } from "@/components/messenger/media/useRecorder";
import { Chat, Message, ReplyPreview, AuthUser, Attachment } from "@/components/messenger/types";
import { API_CHATS, API_SEND } from "./config";

const TYPING_PING_MS = 3000;

interface UseSendMessageParams {
  authUser: AuthUser | null;
  authHeaders: () => Record<string, string>;
  chats: Chat[];
  setChats: Dispatch<SetStateAction<Chat[]>>;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  activeChatId: number | null;
  activeTopicId: number | null;
  isBotChat: boolean;
  isGroupChat: boolean;
  botMessages: Record<number, Message[]>;
  inputText: string;
  setInputText: Dispatch<SetStateAction<string>>;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  sendBotMessage: () => void;
  lastMessagesSigRef: MutableRefObject<string>;
}

export function useSendMessage({
  authUser,
  authHeaders,
  chats,
  setChats,
  messages,
  setMessages,
  activeChatId,
  activeTopicId,
  isBotChat,
  isGroupChat,
  botMessages,
  inputText,
  setInputText,
  attachments,
  setAttachments,
  sendBotMessage,
  lastMessagesSigRef,
}: UseSendMessageParams) {
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [sendError, setSendError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const sendSticker = async (path: string) => {
    if (!activeChatId || activeChatId < 0 || isBotChat || sending) return;
    const replyTarget = replyTo;
    const tempId = Date.now();
    const time = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    setSendError("");
    setReplyTo(null);
    setMessages((prev) => [...prev, { id: tempId, text: path, out: true, read: false, time, sender_id: authUser?.id ?? 1 }]);
    try {
      const res = await fetch(API_SEND, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ chat_id: activeChatId, topic_id: activeTopicId, reply_to_id: replyTarget?.id ?? null, text: path }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setSendError(data.error || "Не удалось отправить стикер");
        return;
      }
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...data } : m)));
      setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, lastMsg: "🖼 Стикер", time: data.time } : c)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setSendError("Не удалось связаться с сервером");
    }
  };

  const sendGif = async (url: string) => {
    if (!activeChatId || activeChatId < 0 || isBotChat || sending) return;
    const replyTarget = replyTo;
    const tempId = Date.now();
    const time = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    setSendError("");
    setReplyTo(null);
    setMessages((prev) => [
      ...prev,
      { id: tempId, text: url, out: true, read: false, time, sender_id: authUser?.id ?? 1 },
    ]);
    try {
      const res = await fetch(API_SEND, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          chat_id: activeChatId,
          topic_id: activeTopicId,
          reply_to_id: replyTarget?.id ?? null,
          text: url,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setSendError(data.error || "Не удалось отправить GIF");
        return;
      }
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...data } : m)));
      setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, lastMsg: "🎞 GIF", time: data.time } : c)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setSendError("Не удалось связаться с сервером");
    }
  };

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

  return {
    sending,
    replyTo,
    setReplyTo,
    editingMessage,
    setEditingMessage,
    sendError,
    setSendError,
    messagesEndRef,
    sendMedia,
    sendMessage,
    sendSticker,
    sendGif,
    startReply,
    startEdit,
    cancelComposerContext,
  };
}
