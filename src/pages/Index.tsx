import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

// ─── Incoming Call ──────────────────────────────────────────────────────────
interface IncomingCallProps {
  caller: { name: string; avatar: string; color: string };
  isVideo: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

function IncomingCall({ caller, isVideo, onAccept, onDecline }: IncomingCallProps) {
  const [ring, setRing] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setRing((r) => r + 1), 600);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center pb-10 px-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden animate-slide-up"
        style={{ background: "linear-gradient(160deg, #1a0d35 0%, #0e1a2e 100%)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {/* Glow */}
        <div className="relative h-48 flex flex-col items-center justify-center gap-3 overflow-hidden">
          <div className="absolute inset-0 opacity-30"
            style={{ background: `radial-gradient(circle at 50% 60%, ${caller.color} 0%, transparent 70%)` }} />

          {/* Pulsing rings */}
          {[0, 1, 2].map((i) => (
            <div key={i} className="absolute rounded-full border border-white/[0.06]"
              style={{
                width: `${140 + i * 50}px`,
                height: `${140 + i * 50}px`,
                opacity: ring % 3 === i ? 0.4 : 0.08,
                transition: "opacity 0.3s ease",
              }} />
          ))}

          {/* Avatar */}
          <div
            className="relative z-10 flex h-20 w-20 items-center justify-center rounded-3xl text-2xl font-black text-white shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${caller.color}cc, ${caller.color}66)`,
              boxShadow: `0 0 30px ${caller.color}44`,
            }}
          >
            {caller.avatar}
          </div>

          <div className="relative z-10 text-center">
            <p className="text-lg font-bold text-white">{caller.name}</p>
            <p className="text-sm text-white/40 mt-0.5 flex items-center justify-center gap-1.5">
              {isVideo ? <><Icon name="Video" size={13} />Входящий видеозвонок</> : <><Icon name="Phone" size={13} />Входящий звонок</>}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 px-6 py-6">
          {/* Decline */}
          <button
            onClick={onDecline}
            className="flex flex-1 flex-col items-center gap-2 rounded-2xl bg-red-500/15 border border-red-500/30 py-4 text-red-400 hover:bg-red-500/25 transition-all active:scale-95"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 shadow-lg shadow-red-500/30">
              <Icon name="PhoneOff" size={22} className="text-white" />
            </div>
            <span className="text-xs font-medium">Отклонить</span>
          </button>

          {/* Message */}
          <button
            onClick={onDecline}
            className="flex flex-1 flex-col items-center gap-2 rounded-2xl bg-white/[0.05] border border-white/[0.08] py-4 text-white/50 hover:bg-white/[0.08] transition-all active:scale-95"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.08]">
              <Icon name="MessageCircle" size={22} />
            </div>
            <span className="text-xs font-medium">Сообщение</span>
          </button>

          {/* Accept */}
          <button
            onClick={onAccept}
            className="flex flex-1 flex-col items-center gap-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 py-4 text-emerald-400 hover:bg-emerald-500/25 transition-all active:scale-95"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30"
              style={{ animation: "callRing 1s ease-in-out infinite" }}>
              <Icon name={isVideo ? "Video" : "Phone"} size={22} className="text-white" />
            </div>
            <span className="text-xs font-medium">Принять</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Call Screen ────────────────────────────────────────────────────────────
interface CallScreenProps {
  chat: { name: string; avatar: string; color: string; isGroup: boolean };
  isVideo: boolean;
  onEnd: () => void;
}

const GROUP_PARTICIPANTS = [
  { name: "Алиса", avatar: "АМ", color: "#a855f7", muted: false },
  { name: "Дмитрий", avatar: "ДК", color: "#ec4899", muted: true },
  { name: "Вы", avatar: "ВА", color: "#6366f1", muted: false },
];

function CallScreen({ chat, isVideo, onEnd }: CallScreenProps) {
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(!isVideo);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<"connecting" | "ringing" | "active">("connecting");

  useEffect(() => {
    const t1 = setTimeout(() => setStatus("ringing"), 800);
    const t2 = setTimeout(() => setStatus("active"), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (status !== "active") return;
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [status]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  const statusLabel =
    status === "connecting" ? "Соединение..." :
    status === "ringing" ? "Вызов..." :
    fmt(seconds);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0f0720 0%, #130a2a 40%, #0a1520 100%)" }}>

      {/* Orb bg */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${chat.color} 0%, transparent 70%)`, filter: "blur(60px)" }} />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #ec4899 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #38bdf8 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      {/* Header */}
      <div className="relative z-10 w-full flex items-center justify-between px-6 pt-5">
        <button onClick={onEnd}
          className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/[0.08] border border-white/[0.1] text-white/60 hover:text-white transition-all">
          <Icon name="ChevronDown" size={18} />
        </button>
        <span className="text-sm font-medium text-white/40">
          {isVideo ? "Видеозвонок" : "Голосовой звонок"}
          {chat.isGroup && " · группа"}
        </span>
        <button className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/[0.08] border border-white/[0.1] text-white/60 hover:text-white transition-all">
          <Icon name="MoreHorizontal" size={18} />
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center w-full px-6 gap-6">
        {chat.isGroup ? (
          /* Group tiles */
          <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
            {GROUP_PARTICIPANTS.map((p, i) => (
              <div key={i} className="flex flex-col items-center gap-2 rounded-2xl bg-white/[0.05] border border-white/[0.07] p-4 animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}>
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-base font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${p.color}cc, ${p.color}55)`, boxShadow: status === "active" ? `0 0 20px ${p.color}44` : "none" }}>
                    {p.avatar}
                  </div>
                  {p.muted && (
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/80 border border-background">
                      <Icon name="MicOff" size={10} className="text-white" />
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/60">{p.name}</span>
              </div>
            ))}
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.1] p-4 cursor-pointer hover:border-purple-400/30 transition-all">
              <Icon name="UserPlus" size={20} className="text-white/30" />
              <span className="text-[10px] text-white/30">Добавить</span>
            </div>
          </div>
        ) : (
          /* Personal avatar */
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div
                className="flex h-28 w-28 items-center justify-center rounded-3xl text-3xl font-black text-white"
                style={{
                  background: `linear-gradient(135deg, ${chat.color}cc, ${chat.color}66)`,
                  boxShadow: status === "active"
                    ? `0 0 0 0 ${chat.color}00, 0 0 40px ${chat.color}44`
                    : "none",
                  animation: status === "ringing" ? "callRing 1.2s ease-in-out infinite" : "none",
                }}
              >
                {chat.avatar}
              </div>
              {status === "active" && (
                <div className="absolute -inset-3 rounded-[2rem] border border-white/[0.08] animate-ping" style={{ animationDuration: "2s" }} />
              )}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-1">{chat.name}</h2>
              <p className={`text-sm font-medium transition-colors ${status === "active" ? "text-emerald-400" : "text-white/40"}`}>
                {statusLabel}
              </p>
            </div>
          </div>
        )}

        {chat.isGroup && (
          <p className={`text-sm font-medium ${status === "active" ? "text-emerald-400" : "text-white/40"}`}>
            {statusLabel}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="relative z-10 w-full px-6 pb-10">
        <div className="flex items-center justify-center gap-4">
          {/* Mute */}
          <button onClick={() => setMuted(!muted)}
            className={`flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-2xl border transition-all ${
              muted ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-white/[0.08] border-white/[0.1] text-white/70 hover:text-white"
            }`}>
            <Icon name={muted ? "MicOff" : "Mic"} size={22} />
          </button>

          {/* Camera (only for video) */}
          {isVideo && (
            <button onClick={() => setCamOff(!camOff)}
              className={`flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-2xl border transition-all ${
                camOff ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-white/[0.08] border-white/[0.1] text-white/70 hover:text-white"
              }`}>
              <Icon name={camOff ? "VideoOff" : "Video"} size={22} />
            </button>
          )}

          {/* Speaker */}
          <button onClick={() => setSpeakerOff(!speakerOff)}
            className={`flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-2xl border transition-all ${
              speakerOff ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-white/[0.08] border-white/[0.1] text-white/70 hover:text-white"
            }`}>
            <Icon name={speakerOff ? "VolumeX" : "Volume2"} size={22} />
          </button>

          {/* End call */}
          <button onClick={onEnd}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/30 transition-all hover:scale-105 active:scale-95">
            <Icon name="PhoneOff" size={26} />
          </button>
        </div>
      </div>
    </div>
  );
}

const API_CHATS = "https://functions.poehali.dev/02006132-fa5e-4fd7-9d61-402c7deef46a";
const API_SEND = "https://functions.poehali.dev/a624a32e-0a00-444a-84ab-7edd26fc13a5";

interface Chat {
  id: number;
  name: string;
  isGroup: boolean;
  color: string;
  lastMsg: string;
  time: string;
  unread: number;
  online: boolean;
  avatar: string;
}

interface Message {
  id: number;
  text: string;
  out: boolean;
  read: boolean;
  time: string;
  sender_id: number;
}

type Tab = "chats" | "contacts" | "notifications" | "gallery" | "search" | "profile";

const NOTIFICATIONS = [
  { id: 1, icon: "MessageCircle", text: "Алиса прислала 3 новых сообщения", time: "сейчас", color: "#a855f7" },
  { id: 2, icon: "Users", text: "Дмитрий добавил вас в группу «Проект Альфа»", time: "13:00", color: "#38bdf8" },
  { id: 3, icon: "Heart", text: "Мария отреагировала на ваше сообщение", time: "Вт", color: "#ec4899" },
  { id: 4, icon: "Shield", text: "Сквозное шифрование активно для всех чатов 🔒", time: "Вс", color: "#34d399" },
];

const GALLERY_ITEMS = [
  { id: 1, type: "photo", bg: "linear-gradient(135deg, #a855f7, #ec4899)" },
  { id: 2, type: "photo", bg: "linear-gradient(135deg, #38bdf8, #6366f1)" },
  { id: 3, type: "gif", bg: "linear-gradient(135deg, #f59e0b, #ef4444)" },
  { id: 4, type: "photo", bg: "linear-gradient(135deg, #34d399, #38bdf8)" },
  { id: 5, type: "gif", bg: "linear-gradient(135deg, #ec4899, #a855f7)" },
  { id: 6, type: "photo", bg: "linear-gradient(135deg, #6366f1, #34d399)" },
  { id: 7, type: "gif", bg: "linear-gradient(135deg, #38bdf8, #ec4899)" },
  { id: 8, type: "photo", bg: "linear-gradient(135deg, #a855f7, #38bdf8)" },
  { id: 9, type: "photo", bg: "linear-gradient(135deg, #f59e0b, #a855f7)" },
];

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

  const activeChat = chats.find((c) => c.id === activeChatId);

  // Simulate incoming call after chats load
  useEffect(() => {
    const t = setTimeout(() => {
      setIncomingCall({
        caller: { name: "Алиса Морозова", avatar: "АМ", color: "#a855f7" },
        isVideo: false,
      });
    }, 4000);
    return () => clearTimeout(t);
  }, []);

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
    if (!activeChatId) return;
    setLoadingMsgs(true);
    setMessages([]);
    fetch(`${API_CHATS}?action=messages&chat_id=${activeChatId}`)
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []))
      .finally(() => setLoadingMsgs(false));
  }, [activeChatId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
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
    setSending(true);

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

  const tabs: { id: Tab; icon: string; badge?: number }[] = [
    { id: "chats", icon: "MessageCircle", badge: chats.reduce((s, c) => s + c.unread, 0) || undefined },
    { id: "contacts", icon: "Users" },
    { id: "notifications", icon: "Bell", badge: 4 },
    { id: "gallery", icon: "Image" },
    { id: "search", icon: "Search" },
    { id: "profile", icon: "User" },
  ];

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background font-golos">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Sidebar */}
      <aside className="relative z-10 flex h-full flex-col" style={{ width: "var(--sidebar-width)" }}>
        <div className="glass-strong flex h-full flex-col border-r border-white/[0.06]">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-btn shadow-lg shadow-purple-500/30">
              <span className="text-lg font-black text-white">С</span>
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text leading-none">Серж</h1>
              <p className="text-[11px] text-white/35 mt-0.5">мессенджер</p>
            </div>
            <div className="ml-auto">
              <button className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all">
                <Icon name="PenSquare" size={16} />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white/[0.05] border border-white/[0.06] px-3 py-2.5">
              <Icon name="Search" size={14} className="text-white/30" />
              <input
                className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/25 outline-none"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="flex gap-1 px-3 pb-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-white/[0.08] text-white"
                    : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
                }`}
              >
                <Icon name={tab.icon} size={16} />
                {tab.badge ? (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full gradient-btn text-[9px] font-bold text-white px-1">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-3 pb-4">

            {/* CHATS */}
            {activeTab === "chats" && (
              <div className="space-y-1">
                {loadingChats ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-2xl">
                      <div className="h-11 w-11 rounded-2xl bg-white/[0.06] animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-2/3 rounded-full bg-white/[0.06] animate-pulse" />
                        <div className="h-2.5 w-1/2 rounded-full bg-white/[0.04] animate-pulse" />
                      </div>
                    </div>
                  ))
                ) : (
                  filteredChats.map((chat, i) => (
                    <button
                      key={chat.id}
                      onClick={() => setActiveChatId(chat.id)}
                      className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all animate-fade-in ${
                        activeChatId === chat.id
                          ? "bg-white/[0.08] border border-white/[0.08]"
                          : "hover:bg-white/[0.04]"
                      }`}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="relative shrink-0">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${chat.color}cc, ${chat.color}66)`, border: `1px solid ${chat.color}33` }}
                        >
                          {chat.avatar}
                        </div>
                        {chat.online && !chat.isGroup && (
                          <span className="online-pulse absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-white/90 truncate">{chat.name}</span>
                          <span className="text-[11px] text-white/30 ml-2 shrink-0">{chat.time}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs text-white/40 truncate">{chat.lastMsg}</span>
                          {chat.unread > 0 && (
                            <span className="ml-2 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full gradient-btn text-[10px] font-bold text-white px-1">
                              {chat.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* CONTACTS */}
            {activeTab === "contacts" && (
              <div className="animate-fade-in">
                <p className="text-xs text-white/30 font-medium mb-3 px-1">КОНТАКТЫ · {chats.length}</p>
                <div className="space-y-1">
                  {chats.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-white/[0.04] transition-all group">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${c.color}cc, ${c.color}55)` }}
                      >
                        {c.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white/90">{c.name}</p>
                        <p className="text-xs text-white/35">{c.online ? "онлайн" : "был(а) недавно"}</p>
                      </div>
                      <button
                        onClick={() => { setActiveChatId(c.id); setActiveTab("chats"); }}
                        className="opacity-0 group-hover:opacity-100 flex h-8 w-8 items-center justify-center rounded-xl gradient-btn text-white transition-all"
                      >
                        <Icon name="MessageCircle" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.1] py-3 text-sm text-white/30 hover:text-white/60 hover:border-white/20 transition-all">
                  <Icon name="UserPlus" size={16} />
                  Добавить контакт
                </button>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <div className="animate-fade-in space-y-2">
                <p className="text-xs text-white/30 font-medium mb-3 px-1">УВЕДОМЛЕНИЯ</p>
                {NOTIFICATIONS.map((n) => (
                  <div key={n.id} className="flex gap-3 rounded-2xl p-3 bg-white/[0.03] border border-white/[0.05]">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${n.color}22`, border: `1px solid ${n.color}33` }}
                    >
                      <Icon name={n.icon} size={16} style={{ color: n.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-white/75 leading-relaxed">{n.text}</p>
                      <p className="text-[11px] text-white/25 mt-1">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* GALLERY */}
            {activeTab === "gallery" && (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-xs text-white/30 font-medium">МЕДИАФАЙЛЫ</p>
                  <div className="flex gap-2 text-xs">
                    <button className="text-white/60 border-b border-purple-400 pb-0.5">Всё</button>
                    <button className="text-white/30 hover:text-white/60 transition-colors">Фото</button>
                    <button className="text-white/30 hover:text-white/60 transition-colors">GIF</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {GALLERY_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className="aspect-square rounded-xl overflow-hidden relative cursor-pointer hover:scale-[1.03] transition-transform"
                      style={{ background: item.bg }}
                    >
                      {item.type === "gif" && (
                        <span className="absolute top-1 left-1 rounded-md bg-black/50 px-1.5 py-0.5 text-[9px] font-bold text-white">GIF</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SEARCH */}
            {activeTab === "search" && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-3 mb-4">
                  <Icon name="Search" size={16} className="text-purple-400" />
                  <input
                    className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/25 outline-none"
                    placeholder="Поиск пользователей..."
                    autoFocus
                  />
                </div>
                <p className="text-xs text-white/25 px-1 mb-3">РЕКОМЕНДАЦИИ</p>
                {chats.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-white/[0.04] cursor-pointer transition-all"
                    onClick={() => { setActiveChatId(c.id); setActiveTab("chats"); }}
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${c.color}cc, ${c.color}55)` }}
                    >
                      {c.avatar}
                    </div>
                    <span className="text-sm text-white/60">{c.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* PROFILE */}
            {activeTab === "profile" && (
              <div className="animate-fade-in">
                <div className="flex flex-col items-center pt-2 pb-5">
                  <div className="relative mb-3">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl gradient-btn text-2xl font-black text-white shadow-xl shadow-purple-500/30">
                      ВА
                    </div>
                    <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-background border border-white/10 text-white/60 hover:text-white transition-all">
                      <Icon name="Camera" size={12} />
                    </button>
                  </div>
                  <h2 className="text-base font-bold text-white/90">Ваше Имя</h2>
                  <p className="text-xs text-white/35 mt-0.5">@me</p>
                  <div className="mt-2 flex items-center gap-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 px-3 py-1">
                    <Icon name="Shield" size={12} className="text-emerald-400" />
                    <span className="text-[11px] text-emerald-400 font-medium">E2E шифрование активно</span>
                  </div>
                </div>
                {[
                  { icon: "Bell", label: "Уведомления", desc: "Настроить оповещения" },
                  { icon: "Shield", label: "Приватность", desc: "Шифрование и безопасность" },
                  { icon: "Palette", label: "Оформление", desc: "Тема и акценты" },
                  { icon: "HelpCircle", label: "Помощь", desc: "FAQ и поддержка" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-white/[0.04] cursor-pointer transition-all group">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.06] text-white/50 group-hover:text-purple-400 transition-colors">
                      <Icon name={item.icon} size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/80">{item.label}</p>
                      <p className="text-xs text-white/30">{item.desc}</p>
                    </div>
                    <Icon name="ChevronRight" size={14} className="ml-auto text-white/20 group-hover:text-white/40 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Chat area */}
      <main className="relative z-10 flex flex-1 flex-col">
        {/* Call overlay */}
        {call && activeChat && (
          <CallScreen
            chat={activeChat}
            isVideo={call.isVideo}
            onEnd={() => setCall(null)}
          />
        )}

        {activeChat ? (
          <>
            {/* Header */}
            <header className="glass-strong border-b border-white/[0.06] px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${activeChat.color}cc, ${activeChat.color}55)` }}
                  >
                    {activeChat.avatar}
                  </div>
                  {activeChat.online && !activeChat.isGroup && (
                    <span className="online-pulse absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-background" />
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-white/95">{activeChat.name}</h2>
                  <p className="text-xs text-white/35">
                    {activeChat.isGroup ? "групповой чат" : activeChat.online ? "в сети" : "был(а) недавно"}
                  </p>
                </div>

                {showEncryptBadge && (
                  <div className="ml-4 flex items-center gap-1.5 rounded-full bg-emerald-400/[0.08] border border-emerald-400/20 px-3 py-1.5 animate-fade-in">
                    <Icon name="Lock" size={11} className="text-emerald-400" />
                    <span className="text-[11px] text-emerald-400 font-medium">Зашифровано</span>
                    <button onClick={() => setShowEncryptBadge(false)} className="ml-1 text-emerald-400/40 hover:text-emerald-400 transition-colors">
                      <Icon name="X" size={10} />
                    </button>
                  </div>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => setCall({ isVideo: false })}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                  >
                    <Icon name="Phone" size={16} />
                  </button>
                  <button
                    onClick={() => setCall({ isVideo: true })}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                  >
                    <Icon name="Video" size={16} />
                  </button>
                  <button className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all">
                    <Icon name="MoreVertical" size={16} />
                  </button>
                </div>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-2 w-2 rounded-full bg-purple-400/50 animate-pulse"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.out ? "justify-end" : "justify-start"} animate-fade-in`}
                    style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
                  >
                    {!msg.out && (
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white mr-2 self-end mb-1"
                        style={{ background: `linear-gradient(135deg, ${activeChat.color}cc, ${activeChat.color}55)` }}
                      >
                        {activeChat.avatar[0]}
                      </div>
                    )}
                    <div className="max-w-[65%]">
                      <div className={`${/https?:\/\/.*\.gif/.test(msg.text) ? "p-1" : "px-4 py-2.5"} ${msg.out ? "msg-bubble-out text-white" : "msg-bubble-in text-white/85"}`}>
                        {/https?:\/\/.*\.gif/.test(msg.text) ? (
                          <img
                            src={msg.text.match(/https?:\/\/\S+\.gif/)?.[0]}
                            alt="GIF"
                            className="rounded-xl max-w-[220px] max-h-[160px] object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        )}
                      </div>
                      <div className={`flex items-center gap-1 mt-1 px-1 ${msg.out ? "justify-end" : "justify-start"}`}>
                        <span className="text-[10px] text-white/25">{msg.time}</span>
                        {msg.out && (
                          <Icon name={msg.read ? "CheckCheck" : "Check"} size={12} className={msg.read ? "text-purple-400" : "text-white/25"} />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="glass-strong border-t border-white/[0.06] px-4 py-3">
              {/* Attachments preview */}
              {attachments.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2 animate-fade-in"
                      style={{ background: `${att.color}18`, border: `1px solid ${att.color}33` }}>
                      <Icon name={att.icon} size={14} style={{ color: att.color }} />
                      <div className="max-w-[120px]">
                        <p className="text-xs font-medium text-white/80 truncate">{att.name}</p>
                        <p className="text-[10px]" style={{ color: att.color }}>{att.size}</p>
                      </div>
                      <button onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                        className="ml-1 text-white/25 hover:text-white/60 transition-colors">
                        <Icon name="X" size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-3">
                {/* Attach button with popup */}
                <div className="relative">
                  <button
                    onClick={() => setAttachMenuOpen((v) => !v)}
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
                      attachMenuOpen
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : "text-white/30 hover:text-purple-400 hover:bg-purple-400/[0.08]"
                    }`}
                  >
                    <Icon name={attachMenuOpen ? "X" : "Paperclip"} size={18} />
                  </button>

                  {/* Attach menu */}
                  {attachMenuOpen && (
                    <div ref={attachMenuRef} className="absolute bottom-14 left-0 rounded-2xl overflow-hidden animate-fade-in z-20"
                      style={{ background: "rgba(18,10,35,0.95)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)", minWidth: "200px" }}>
                      {[
                        { label: "Фото и видео", icon: "Image", color: "#a855f7", ref: imageInputRef, accept: "image/*,video/*" },
                        { label: "Файл", icon: "File", color: "#38bdf8", ref: fileInputRef, accept: "*" },
                        { label: "Документ", icon: "FileText", color: "#34d399", ref: null, accept: ".pdf,.doc,.docx,.xls,.xlsx" },
                      ].map((item) => (
                        <button
                          key={item.label}
                          onClick={() => {
                            if (item.ref) {
                              item.ref.current?.click();
                            } else {
                              fileInputRef.current!.accept = item.accept;
                              fileInputRef.current?.click();
                            }
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3 hover:bg-white/[0.06] transition-all text-left"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl"
                            style={{ background: `${item.color}22` }}>
                            <Icon name={item.icon} size={16} style={{ color: item.color }} />
                          </div>
                          <span className="text-sm text-white/75">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Emoji / GIF picker */}
                <div className="relative" ref={emojiPickerRef}>
                  <button
                    onClick={() => setEmojiPickerOpen((v) => !v)}
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
                      emojiPickerOpen
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : "text-white/30 hover:text-purple-400 hover:bg-purple-400/[0.08]"
                    }`}
                  >
                    <Icon name="Smile" size={18} />
                  </button>

                  {emojiPickerOpen && (
                    <div
                      className="absolute bottom-14 left-0 w-80 rounded-2xl overflow-hidden animate-fade-in z-20 flex flex-col"
                      style={{ background: "rgba(14,8,28,0.97)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(24px)", height: "340px" }}
                    >
                      {/* Tabs */}
                      <div className="flex border-b border-white/[0.07] shrink-0">
                        {[
                          { id: "emoji" as const, label: "😊 Эмодзи" },
                          { id: "gif" as const, label: "🎬 GIF" },
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setEmojiTab(t.id)}
                            className={`flex-1 py-3 text-sm font-medium transition-all ${
                              emojiTab === t.id
                                ? "text-white border-b-2 border-purple-400"
                                : "text-white/35 hover:text-white/60"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {emojiTab === "emoji" && (
                        <div className="flex flex-1 overflow-hidden">
                          {/* Category sidebar */}
                          <div className="flex flex-col gap-1 p-2 border-r border-white/[0.06] shrink-0">
                            {EMOJI_CATEGORIES.map((cat, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  document.getElementById(`emoji-cat-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-base hover:bg-white/[0.08] transition-all"
                                title={cat.title}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>
                          {/* Emoji grid */}
                          <div className="flex-1 overflow-y-auto p-2">
                            {EMOJI_CATEGORIES.map((cat, ci) => (
                              <div key={ci} id={`emoji-cat-${ci}`} className="mb-3">
                                <p className="text-[10px] text-white/25 font-medium mb-1.5 px-1 uppercase tracking-wider">{cat.title}</p>
                                <div className="grid grid-cols-8 gap-0.5">
                                  {cat.emojis.map((em, ei) => (
                                    <button
                                      key={ei}
                                      onClick={() => {
                                        setInputText((prev) => prev + em);
                                        setEmojiPickerOpen(false);
                                      }}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-white/[0.08] transition-all hover:scale-110"
                                    >
                                      {em}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {emojiTab === "gif" && (
                        <div className="flex flex-col flex-1 overflow-hidden">
                          {/* Search */}
                          <div className="px-3 py-2 border-b border-white/[0.06] shrink-0">
                            <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2">
                              <Icon name="Search" size={13} className="text-white/30" />
                              <input
                                className="flex-1 bg-transparent text-xs text-white/80 placeholder:text-white/25 outline-none"
                                placeholder="Поиск GIF..."
                                value={gifSearch}
                                onChange={(e) => setGifSearch(e.target.value)}
                              />
                              {gifSearch && (
                                <button onClick={() => setGifSearch("")} className="text-white/25 hover:text-white/60">
                                  <Icon name="X" size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                          {/* GIF grid */}
                          <div className="flex-1 overflow-y-auto p-2">
                            {filteredGifs ? (
                              <div className="grid grid-cols-2 gap-2">
                                {filteredGifs.map((gif, i) => (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      setInputText((prev) => prev ? prev + " " + gif.url : gif.url);
                                      setEmojiPickerOpen(false);
                                    }}
                                    className="aspect-video rounded-xl overflow-hidden hover:scale-[1.03] transition-transform bg-white/[0.04]"
                                  >
                                    <img src={gif.url} alt={gif.title} className="w-full h-full object-cover" loading="lazy" />
                                  </button>
                                ))}
                              </div>
                            ) : (
                              GIF_CATEGORIES.map((cat, ci) => (
                                <div key={ci} className="mb-4">
                                  <p className="text-[10px] text-white/25 font-medium mb-2 px-1 uppercase tracking-wider">{cat.label}</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {cat.gifs.map((gif, gi) => (
                                      <button
                                        key={gi}
                                        onClick={() => {
                                          setInputText((prev) => prev ? prev + " " + gif.url : gif.url);
                                          setEmojiPickerOpen(false);
                                        }}
                                        className="aspect-video rounded-xl overflow-hidden hover:scale-[1.03] transition-transform bg-white/[0.04]"
                                      >
                                        <img src={gif.url} alt={gif.title} className="w-full h-full object-cover" loading="lazy" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Hidden file inputs */}
                <input ref={fileInputRef} type="file" multiple className="hidden" accept="*" onChange={handleFileSelect} />
                <input ref={imageInputRef} type="file" multiple className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />

                <div className="flex-1 flex items-end gap-3 rounded-2xl bg-white/[0.05] border border-white/[0.07] px-4 py-3 focus-within:border-purple-500/40 transition-all">
                  <textarea
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none"
                    placeholder={attachments.length > 0 ? "Добавить подпись..." : "Сообщение..."}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    style={{ maxHeight: "120px" }}
                  />
                  <Icon name="Lock" size={12} className="text-emerald-400/40 shrink-0 mb-0.5" />
                </div>

                <button
                  onClick={sendMessage}
                  disabled={(!inputText.trim() && attachments.length === 0) || sending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl gradient-btn text-white shadow-lg shadow-purple-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:-translate-y-0.5"
                >
                  <Icon name={sending ? "Loader" : "Send"} size={16} className={sending ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center animate-fade-in">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl gradient-btn shadow-2xl shadow-purple-500/30">
                <Icon name="MessageCircle" size={36} className="text-white" />
              </div>
              <h2 className="text-xl font-bold gradient-text mb-2">Серж мессенджер</h2>
              <p className="text-sm text-white/30">Выберите чат для начала общения</p>
            </div>
          </div>
        )}
      </main>

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