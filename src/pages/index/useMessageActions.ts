import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";
import { Chat, Message, PinnedMessage, PollData, AuthUser } from "@/components/messenger/types";
import { API_CHATS, API_SEND, API_TRANSCRIBE } from "./config";

interface UseMessageActionsParams {
  authUser: AuthUser | null;
  authHeaders: () => Record<string, string>;
  chats: Chat[];
  setChats: Dispatch<SetStateAction<Chat[]>>;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  activeChatId: number | null;
  activeTopicId: number | null;
  setActiveTopicId: (id: number | null) => void;
  isBotChat: boolean;
  setBotMessages: Dispatch<SetStateAction<Record<number, Message[]>>>;
  setInputText: Dispatch<SetStateAction<string>>;
  replyTo: Message | null;
  setReplyTo: Dispatch<SetStateAction<Message | null>>;
  editingMessage: Message | null;
  setEditingMessage: Dispatch<SetStateAction<Message | null>>;
  setSendError: Dispatch<SetStateAction<string>>;
  loadingMsgs: boolean;
}

export function useMessageActions({
  authUser,
  authHeaders,
  chats,
  setChats,
  messages,
  setMessages,
  activeChatId,
  activeTopicId,
  setActiveTopicId,
  isBotChat,
  setBotMessages,
  setInputText,
  replyTo,
  setReplyTo,
  editingMessage,
  setEditingMessage,
  setSendError,
  loadingMsgs,
}: UseMessageActionsParams) {
  const [jumpRequest, setJumpRequest] = useState<{ id: number; nonce: number } | null>(null);
  const pendingJumpRef = useRef<number | null>(null);

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

  const createPoll = async (question: string, options: string[], multiple: boolean): Promise<string | null> => {
    if (!activeChatId || activeChatId < 0) return "Откройте группу, чтобы создать опрос";
    try {
      const res = await fetch(`${API_CHATS}?action=create-poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ chat_id: activeChatId, topic_id: activeTopicId, question, options, multiple }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error || "Не удалось создать опрос";
      const poll = data.poll;
      setMessages((prev) => [
        ...prev,
        { id: data.messageId, text: "📊 " + question, out: true, read: false, time: data.time, sender_id: authUser?.id ?? 1, poll },
      ]);
      setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, lastMsg: "📊 " + question, time: data.time } : c)));
      return null;
    } catch {
      return "Не удалось связаться с сервером";
    }
  };

  const replacePoll = (poll: PollData) =>
    setMessages((prev) => prev.map((m) => (m.poll && m.poll.id === poll.id ? { ...m, poll } : m)));

  const votePoll = async (pollId: number, optionIds: number[]) => {
    const previous = messages.find((m) => m.poll?.id === pollId)?.poll;
    if (previous) {
      const picked = new Set(optionIds);
      const voters = previous.voters + (previous.myVoted ? 0 : optionIds.length ? 1 : 0) - (previous.myVoted && optionIds.length === 0 ? 1 : 0);
      replacePoll({
        ...previous,
        myVoted: optionIds.length > 0,
        voters,
        options: previous.options.map((o) => {
          const votes = o.votes - (o.mine ? 1 : 0) + (picked.has(o.id) ? 1 : 0);
          return { ...o, votes, mine: picked.has(o.id), percent: voters > 0 ? Math.round((votes * 100) / voters) : 0 };
        }),
      });
    }
    try {
      const res = await fetch(`${API_CHATS}?action=vote-poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ poll_id: pollId, option_ids: optionIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (previous) replacePoll(previous);
        setSendError(data.error || "Не удалось проголосовать");
        return;
      }
      replacePoll(data.poll);
    } catch {
      if (previous) replacePoll(previous);
      setSendError("Не удалось связаться с сервером");
    }
  };

  const closePoll = async (pollId: number) => {
    try {
      const res = await fetch(`${API_CHATS}?action=close-poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ poll_id: pollId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(data.error || "Не удалось завершить опрос");
        return;
      }
      replacePoll(data.poll);
    } catch {
      setSendError("Не удалось связаться с сервером");
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

  const forwardMessage = async (message: Message, targetChatId: number): Promise<string | null> => {
    try {
      const res = await fetch(API_SEND, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ chat_id: targetChatId, forward_message_id: message.id }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || "Не удалось переслать сообщение";
      const label =
        data.kind === "voice" ? "🎤 Голосовое сообщение"
        : data.kind === "circle" ? "⭕ Видеосообщение"
        : data.kind === "image" ? "🖼 Фото"
        : data.kind === "file" ? `📎 ${data.fileName || "Файл"}`
        : data.text;
      setChats((prev) =>
        prev.map((c) => (c.id === targetChatId ? { ...c, lastMsg: label, time: data.time } : c))
      );
      if (targetChatId === activeChatId && !activeTopicId) {
        setMessages((prev) => [...prev, data]);
      }
      return null;
    } catch {
      return "Не удалось связаться с сервером";
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
    transcribeMessage,
    createPoll,
    votePoll,
    closePoll,
    pinMessage,
    openPinned,
    forwardMessage,
    removeMessage,
    toggleReaction,
    jumpRequest,
  };
}
