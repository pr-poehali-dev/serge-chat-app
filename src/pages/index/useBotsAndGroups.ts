import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";
import { generateBotReply } from "@/components/messenger/botReplies";
import { crocodileWelcome, handleCrocodileMessage, CrocodileState } from "@/components/messenger/crocodileGame";
import { Chat, Message, Tab, BotInfo, Topic, Attachment } from "@/components/messenger/types";
import { API_CHATS, CROCODILE_USERNAME } from "./config";

interface UseBotsAndGroupsParams {
  authHeaders: () => Record<string, string>;
  reloadChats: () => Promise<void>;
  setChats: Dispatch<SetStateAction<Chat[]>>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  activeChatId: number | null;
  setActiveChatId: (id: number | null) => void;
  setActiveTab: (tab: Tab) => void;
  isGroupChat: boolean;
  inputText: string;
  setInputText: Dispatch<SetStateAction<string>>;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
}

export function useBotsAndGroups({
  authHeaders,
  reloadChats,
  setChats,
  setMessages,
  activeChatId,
  setActiveChatId,
  setActiveTab,
  isGroupChat,
  inputText,
  setInputText,
  attachments,
  setAttachments,
}: UseBotsAndGroupsParams) {
  const [bots, setBots] = useState<Chat[]>([]);
  const [botMessages, setBotMessages] = useState<Record<number, Message[]>>({});
  const [botStoreOpen, setBotStoreOpen] = useState(false);
  const botInfoRef = useRef<Record<number, BotInfo>>({});
  const [botTyping, setBotTyping] = useState(false);
  const crocodileStateRef = useRef<Record<number, CrocodileState>>({});
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [groupTopics, setGroupTopics] = useState<Record<number, Topic[]>>({});
  const [activeTopicId, setActiveTopicId] = useState<number | null>(null);
  const [createTopicOpen, setCreateTopicOpen] = useState(false);
  const [groupMembersOpen, setGroupMembersOpen] = useState(false);

  const loadTopics = async (chatId: number) => {
    if (chatId <= 0) return;
    try {
      const res = await fetch(`${API_CHATS}?action=topics&chat_id=${chatId}`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setGroupTopics((prev) => ({ ...prev, [chatId]: data.topics || [] }));
    } catch {
      return;
    }
  };

  const createGroup = async (name: string, memberIds: number[]) => {
    try {
      const res = await fetch(`${API_CHATS}?action=create-group`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name, member_ids: memberIds }),
      });
      const data = await res.json();
      if (!res.ok) return;
      await reloadChats();
      setMessages([]);
      setActiveTopicId(null);
      setCreateGroupOpen(false);
      setActiveChatId(data.chat_id);
      setActiveTab("chats");
    } catch {
      return;
    }
  };

  const installBot = (bot: BotInfo) => {
    const id = -(Date.now());
    const newChat: Chat = {
      id,
      name: bot.name,
      isGroup: false,
      color: bot.color,
      lastMsg: "Нажмите, чтобы начать диалог",
      time: "сейчас",
      unread: 0,
      online: true,
      avatar: bot.avatar,
      isBot: true,
    };
    botInfoRef.current[id] = bot;
    setBots((prev) => [...prev, newChat]);

    let welcomeText = `Привет! Я ${bot.name} 👋 ${bot.description}`;
    if (bot.username === CROCODILE_USERNAME) {
      const { state, reply } = crocodileWelcome();
      crocodileStateRef.current[id] = state;
      welcomeText = reply;
    }

    setBotMessages((prev) => ({
      ...prev,
      [id]: [
        {
          id: Date.now(),
          text: welcomeText,
          out: false,
          read: true,
          time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
          sender_id: id,
        },
      ],
    }));
    setBotStoreOpen(false);
    setActiveChatId(id);
    setActiveTab("chats");
  };

  const deleteBot = (id: number) => {
    setBots((prev) => prev.filter((b) => b.id !== id));
    setBotMessages((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    delete botInfoRef.current[id];
    delete crocodileStateRef.current[id];
    if (activeChatId === id) {
      setActiveChatId(null);
    }
  };

  const leaveGroup = async (id: number) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
    setGroupTopics((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeChatId === id) {
      setActiveChatId(null);
      setActiveTopicId(null);
    }
    if (id < 0) return;
    try {
      await fetch(`${API_CHATS}?action=leave-group`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ chat_id: id }),
      });
    } finally {
      await reloadChats();
    }
  };

  const createTopic = async (name: string, color: string) => {
    if (!activeChatId || activeChatId < 0) return;
    const chatId = activeChatId;
    try {
      const res = await fetch(`${API_CHATS}?action=create-topic`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ chat_id: chatId, name, color }),
      });
      const data = await res.json();
      if (!res.ok) return;
      setGroupTopics((prev) => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), data.topic],
      }));
      setCreateTopicOpen(false);
      setActiveTopicId(data.topic.id);
    } catch {
      return;
    }
  };

  const togglePinTopic = async (topicId: number) => {
    if (!activeChatId) return;
    const chatId = activeChatId;
    const current = (groupTopics[chatId] || []).find((t) => t.id === topicId);
    if (!current) return;
    const nextPinned = !current.pinned;
    const apply = (pinned: boolean) =>
      setGroupTopics((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map((t) => (t.id === topicId ? { ...t, pinned } : t)),
      }));
    apply(nextPinned);
    try {
      const res = await fetch(`${API_CHATS}?action=toggle-pin-topic`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ topic_id: topicId, pinned: nextPinned }),
      });
      if (!res.ok) apply(!nextPinned);
    } catch {
      apply(!nextPinned);
    }
  };

  const sendBotMessage = () => {
    const hasText = inputText.trim();
    const hasAttachments = attachments.length > 0;
    if ((!hasText && !hasAttachments) || !activeChatId) return;

    const text = hasText
      ? inputText.trim()
      : attachments.map((a) => `📎 ${a.name} (${a.size})`).join("\n");

    const fullText = hasText && hasAttachments
      ? `${text}\n${attachments.map((a) => `📎 ${a.name} (${a.size})`).join("\n")}`
      : text;

    setInputText("");
    setAttachments([]);

    const userMsg: Message = {
      id: Date.now(),
      text: fullText,
      out: true,
      read: true,
      time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      sender_id: 1,
    };

    const chatId = activeChatId as number;
    setBotMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), userMsg],
    }));

    const bot = botInfoRef.current[chatId];
    setBotTyping(true);
    setTimeout(() => {
      let replyText: string;
      if (bot?.username === CROCODILE_USERNAME) {
        const { state, reply } = handleCrocodileMessage(crocodileStateRef.current[chatId], text);
        crocodileStateRef.current[chatId] = state;
        replyText = reply;
      } else {
        replyText = bot ? generateBotReply(bot, text) : "…";
      }
      const botMsg: Message = {
        id: Date.now() + 1,
        text: replyText,
        out: false,
        read: true,
        time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
        sender_id: chatId,
      };
      setBotMessages((prev) => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), botMsg],
      }));
      setBots((prev) =>
        prev.map((b) => (b.id === chatId ? { ...b, lastMsg: replyText, time: botMsg.time } : b))
      );
      setBotTyping(false);
    }, 1000 + Math.random() * 800);

    setBots((prev) =>
      prev.map((b) => (b.id === chatId ? { ...b, lastMsg: text, time: userMsg.time } : b))
    );
  };

  // Reset active topic when switching chats
  useEffect(() => {
    setActiveTopicId(null);
  }, [activeChatId]);

  // Load topics when a group is opened and keep them fresh for all members
  useEffect(() => {
    if (!activeChatId || activeChatId < 0 || !isGroupChat) return;
    loadTopics(activeChatId);
    const timer = window.setInterval(() => {
      if (!document.hidden) loadTopics(activeChatId);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [activeChatId, isGroupChat]);

  return {
    bots,
    botMessages,
    setBotMessages,
    botStoreOpen,
    setBotStoreOpen,
    botInfoRef,
    botTyping,
    createGroupOpen,
    setCreateGroupOpen,
    groupTopics,
    activeTopicId,
    setActiveTopicId,
    createTopicOpen,
    setCreateTopicOpen,
    groupMembersOpen,
    setGroupMembersOpen,
    createGroup,
    installBot,
    deleteBot,
    leaveGroup,
    createTopic,
    togglePinTopic,
    sendBotMessage,
  };
}
