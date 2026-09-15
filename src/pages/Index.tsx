import { useState, useEffect, useRef } from "react";
import { IncomingCall } from "@/components/messenger/CallOverlays";
import Sidebar from "@/components/messenger/Sidebar";
import ChatArea from "@/components/messenger/ChatArea";
import BotStore from "@/components/messenger/BotStore";
import CreateGroupModal from "@/components/messenger/CreateGroupModal";
import { generateBotReply } from "@/components/messenger/botReplies";
import { crocodileWelcome, handleCrocodileMessage, CrocodileState } from "@/components/messenger/crocodileGame";
import { Chat, Message, Tab, BotInfo } from "@/components/messenger/types";

const CROCODILE_USERNAME = "crocodile_game_bot";

const API_CHATS = "https://functions.poehali.dev/02006132-fa5e-4fd7-9d61-402c7deef46a";
const API_SEND = "https://functions.poehali.dev/a624a32e-0a00-444a-84ab-7edd26fc13a5";

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>("chats");
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEncryptBadge, setShowEncryptBadge] = useState(true);

  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);

  const [call, setCall] = useState<{ isVideo: boolean } | null>(null);

  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; size: string; type: string; icon: string; color: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiTab, setEmojiTab] = useState<"emoji" | "gif">("emoji");
  const [gifSearch, setGifSearch] = useState("");
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [incomingCall, setIncomingCall] = useState<{
    caller: { name: string; avatar: string; color: string };
    isVideo: boolean;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  const [bots, setBots] = useState<Chat[]>([]);
  const [botMessages, setBotMessages] = useState<Record<number, Message[]>>({});
  const [botStoreOpen, setBotStoreOpen] = useState(false);
  const botInfoRef = useRef<Record<number, BotInfo>>({});
  const [botTyping, setBotTyping] = useState(false);
  const crocodileStateRef = useRef<Record<number, CrocodileState>>({});
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  // Close attach menu on outside click
  useEffect(() => {
    if (!attachMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setAttachMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [attachMenuOpen]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!emojiPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setEmojiPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [emojiPickerOpen]);

  const EMOJI_CATEGORIES = [
    { label: "😊", title: "Смайлы", emojis: ["😀","😂","🥹","😍","🥰","😎","🤩","😏","😒","😭","😤","🤯","🥳","😴","🤔","🫡","😇","🥸","🤗","😬","🫠","🤫","🫣","🥺","😢"] },
    { label: "❤️", title: "Сердца", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💕","💞","💓","💗","💖","💘","💝","🔥","⚡","✨","🌟","💫","🎉","🎊","🎈","🎁","🏆"] },
    { label: "👍", title: "Жесты", emojis: ["👍","👎","👏","🙌","🤝","✌️","🤞","🫶","💪","🦾","🫂","👋","🤙","👌","🤌","🫰","☝️","🙏","🤲","🫴","💅","🖐️","✋","🤚","👊"] },
    { label: "🐶", title: "Животные", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐸","🐵","🙈","🙉","🙊","🐔","🦆","🦅","🦉","🦋","🐛","🐌","🐞","🐝"] },
    { label: "🍕", title: "Еда", emojis: ["🍕","🍔","🍟","🌭","🍿","🧂","🥓","🥚","🍳","🧇","🥞","🧈","🍞","🥐","🥨","🧀","🥗","🍱","🍣","🍜","🍝","🍛","🍲","🥘","🍗"] },
    { label: "⚽", title: "Спорт", emojis: ["⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸","🥊","🏆","🥇","🎯","🎮","🕹️","🎲","♟️","🎳","🏹","🛹","🛼","🚴","🤸","🧗"] },
    { label: "🌍", title: "Природа", emojis: ["🌍","🌎","🌏","🌕","🌙","⭐","🌟","☀️","🌤️","⛅","🌈","🌊","🏔️","🌋","🏖️","🏝️","🌴","🌵","🌾","🍀","🌸","🌺","🌻","🌹","🍁"] },
    { label: "🚗", title: "Транспорт", emojis: ["🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","✈️","🚀","🛸","🚂","🛳️","⛵","🚁","🛺","🏍️","🛵","🚲"] },
  ];

  const GIF_CATEGORIES = [
    { label: "🔥 Популярные", gifs: [
      { url: "https://media.tenor.com/x8v1oNUOmg4AAAAM/rickroll-rick-astley.gif", title: "Rick Roll" },
      { url: "https://media.tenor.com/dpFGBCRCDhEAAAAM/thumbs-up.gif", title: "Thumbs Up" },
      { url: "https://media.tenor.com/DPCsKaFMxPsAAAAM/cat-thumbs-up.gif", title: "Cat OK" },
      { url: "https://media.tenor.com/0mfFbqNFkUUAAAAM/doge.gif", title: "Doge" },
      { url: "https://media.tenor.com/I5MKmXqHF_cAAAAM/cat-dance.gif", title: "Cat Dance" },
      { url: "https://media.tenor.com/wnBBi98XT_oAAAAM/pepe-happy.gif", title: "Pepe Happy" },
    ]},
    { label: "😂 Смешные", gifs: [
      { url: "https://media.tenor.com/gFe6bBJy7GYAAAAM/laughing.gif", title: "Laughing" },
      { url: "https://media.tenor.com/PlkFGSKPXo8AAAAM/meme.gif", title: "Meme" },
      { url: "https://media.tenor.com/g_XZf74OOfgAAAAM/funny-cat.gif", title: "Funny Cat" },
      { url: "https://media.tenor.com/LTdEgAFVPXQAAAAM/dog-funny.gif", title: "Funny Dog" },
      { url: "https://media.tenor.com/jIc5y7XWbFUAAAAM/surprised-pikachu.gif", title: "Pikachu" },
      { url: "https://media.tenor.com/n7ZUPG-XjzwAAAAM/this-is-fine.gif", title: "This is Fine" },
    ]},
    { label: "🎉 Праздник", gifs: [
      { url: "https://media.tenor.com/GfSX-u7VGM4AAAAM/celebrate.gif", title: "Celebrate" },
      { url: "https://media.tenor.com/GokHFQctTjgAAAAM/birthday.gif", title: "Birthday" },
      { url: "https://media.tenor.com/eFPFHSN4rJ8AAAAM/party.gif", title: "Party" },
      { url: "https://media.tenor.com/1yB-2puGH9QAAAAM/fireworks.gif", title: "Fireworks" },
      { url: "https://media.tenor.com/26RaN6H-M9IAAAAM/confetti.gif", title: "Confetti" },
      { url: "https://media.tenor.com/g2ADXiVQsUQAAAAM/happy-dance.gif", title: "Happy Dance" },
    ]},
  ];

  const filteredGifs = gifSearch
    ? GIF_CATEGORIES.flatMap((c) => c.gifs).filter((g) => g.title.toLowerCase().includes(gifSearch.toLowerCase()))
    : null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  };

  const getFileInfo = (file: File): { icon: string; color: string } => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return { icon: "Image", color: "#a855f7" };
    if (["mp4", "mov", "avi", "mkv"].includes(ext)) return { icon: "Video", color: "#ec4899" };
    if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return { icon: "Music", color: "#38bdf8" };
    if (["pdf"].includes(ext)) return { icon: "FileText", color: "#ef4444" };
    if (["doc", "docx"].includes(ext)) return { icon: "FileText", color: "#3b82f6" };
    if (["xls", "xlsx"].includes(ext)) return { icon: "FileSpreadsheet", color: "#34d399" };
    if (["zip", "rar", "7z"].includes(ext)) return { icon: "Archive", color: "#f59e0b" };
    return { icon: "File", color: "#6366f1" };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map((f) => ({
      name: f.name,
      size: formatFileSize(f.size),
      type: f.type,
      ...getFileInfo(f),
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    setAttachMenuOpen(false);
    e.target.value = "";
  };

  const activeChat = chats.find((c) => c.id === activeChatId) || bots.find((b) => b.id === activeChatId);
  const isBotChat = bots.some((b) => b.id === activeChatId);
  const displayMessages = isBotChat ? (botMessages[activeChatId as number] || []) : messages;

  const GROUP_COLORS = ["#a855f7", "#ec4899", "#38bdf8", "#34d399", "#f59e0b", "#6366f1"];

  const createGroup = (name: string, memberIds: number[]) => {
    const id = -(Date.now());
    const color = GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
    const memberNames = chats.filter((c) => memberIds.includes(c.id)).map((c) => c.name);
    const newChat: Chat = {
      id,
      name,
      isGroup: true,
      color,
      lastMsg: `Группа создана · ${memberNames.length} участник(ов)`,
      time: "сейчас",
      unread: 0,
      online: true,
      avatar: name.slice(0, 2).toUpperCase(),
    };
    setChats((prev) => [newChat, ...prev]);
    setMessages([]);
    setCreateGroupOpen(false);
    setActiveChatId(id);
    setActiveTab("chats");
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



  // Load chats
  useEffect(() => {
    setLoadingChats(true);
    fetch(API_CHATS)
      .then((r) => r.json())
      .then((data) => {
        setChats(data.chats || []);
        if (data.chats?.length > 0 && !activeChatId) {
          setActiveChatId(data.chats[0].id);
        }
      })
      .finally(() => setLoadingChats(false));
  }, []);

  // Load messages when chat changes
  useEffect(() => {
    if (!activeChatId || isBotChat || activeChatId < 0) return;
    setLoadingMsgs(true);
    setMessages([]);
    fetch(`${API_CHATS}?action=messages&chat_id=${activeChatId}`)
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []))
      .finally(() => setLoadingMsgs(false));
  }, [activeChatId, isBotChat]);

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
        headers: { "Content-Type": "application/json" },
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

  const filteredChats = chats.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background font-golos">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        chats={chats}
        loadingChats={loadingChats}
        filteredChats={filteredChats}
        bots={bots}
        onOpenBotStore={() => setBotStoreOpen(true)}
        onDeleteBot={deleteBot}
        onOpenCreateGroup={() => setCreateGroupOpen(true)}
      />

      <ChatArea
        activeChat={activeChat}
        call={call}
        setCall={setCall}
        showEncryptBadge={showEncryptBadge}
        setShowEncryptBadge={setShowEncryptBadge}
        loadingMsgs={isBotChat ? false : loadingMsgs}
        messages={displayMessages}
        botTyping={isBotChat ? botTyping : false}
        messagesEndRef={messagesEndRef}
        attachments={attachments}
        setAttachments={setAttachments}
        attachMenuOpen={attachMenuOpen}
        setAttachMenuOpen={setAttachMenuOpen}
        attachMenuRef={attachMenuRef}
        fileInputRef={fileInputRef}
        imageInputRef={imageInputRef}
        handleFileSelect={handleFileSelect}
        emojiPickerOpen={emojiPickerOpen}
        setEmojiPickerOpen={setEmojiPickerOpen}
        emojiPickerRef={emojiPickerRef}
        emojiTab={emojiTab}
        setEmojiTab={setEmojiTab}
        EMOJI_CATEGORIES={EMOJI_CATEGORIES}
        GIF_CATEGORIES={GIF_CATEGORIES}
        gifSearch={gifSearch}
        setGifSearch={setGifSearch}
        filteredGifs={filteredGifs}
        inputText={inputText}
        setInputText={setInputText}
        sendMessage={sendMessage}
        sending={isBotChat ? false : sending}
      />

      {/* Bot store modal */}
      {botStoreOpen && (
        <BotStore
          installedUsernames={bots.map((b) => botInfoRef.current[b.id]?.username).filter(Boolean) as string[]}
          onInstall={installBot}
          onClose={() => setBotStoreOpen(false)}
        />
      )}

      {/* Create group modal */}
      {createGroupOpen && (
        <CreateGroupModal
          contacts={chats}
          onCreate={createGroup}
          onClose={() => setCreateGroupOpen(false)}
        />
      )}

      {/* Incoming call overlay */}
      {incomingCall && (
        <IncomingCall
          caller={incomingCall.caller}
          isVideo={incomingCall.isVideo}
          onAccept={() => {
            setIncomingCall(null);
            setCall({ isVideo: incomingCall.isVideo });
          }}
          onDecline={() => setIncomingCall(null)}
        />
      )}
    </div>
  );
}