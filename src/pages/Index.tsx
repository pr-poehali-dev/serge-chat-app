import { useState } from "react";
import Icon from "@/components/ui/icon";

const CONTACTS = [
  { id: 1, name: "Алиса Морозова", avatar: "АМ", online: true, lastMsg: "Окей, увидимся вечером 🔥", time: "14:32", unread: 3, color: "#a855f7" },
  { id: 2, name: "Дмитрий Ковалёв", avatar: "ДК", online: true, lastMsg: "Отправил файлы на почту", time: "13:15", unread: 0, color: "#ec4899" },
  { id: 3, name: "Команда Серж 🚀", avatar: "КС", online: false, lastMsg: "Михаил: Встреча в 15:00", time: "12:00", unread: 12, color: "#38bdf8", isGroup: true },
  { id: 4, name: "Мария Петрова", avatar: "МП", online: false, lastMsg: "Спасибо большое!", time: "Вт", unread: 0, color: "#34d399" },
  { id: 5, name: "Иван Смирнов", avatar: "ИС", online: true, lastMsg: "Когда будет готово?", time: "Пн", unread: 1, color: "#f59e0b" },
  { id: 6, name: "Дизайн отдел", avatar: "ДО", online: false, lastMsg: "Новые макеты загружены", time: "Вс", unread: 0, color: "#6366f1", isGroup: true },
];

const MESSAGES: Record<number, { id: number; text: string; out: boolean; time: string; read?: boolean }[]> = {
  1: [
    { id: 1, text: "Привет! Как дела с проектом? 👋", out: false, time: "14:20" },
    { id: 2, text: "Всё идёт по плану, закончим к пятнице", out: true, time: "14:22", read: true },
    { id: 3, text: "Отлично! Можешь прислать превью?", out: false, time: "14:25" },
    { id: 4, text: "Конечно, сейчас пришлю", out: true, time: "14:28", read: true },
    { id: 5, text: "Окей, увидимся вечером 🔥", out: false, time: "14:32" },
  ],
  2: [
    { id: 1, text: "Дима, привет! Как по задаче?", out: true, time: "13:00", read: true },
    { id: 2, text: "Сделал, отправил файлы на почту", out: false, time: "13:15" },
  ],
  3: [
    { id: 1, text: "Всем привет! Напоминаю — встреча сегодня", out: false, time: "11:45" },
    { id: 2, text: "Подтверждаю участие ✅", out: true, time: "11:50", read: true },
    { id: 3, text: "Михаил: Встреча в 15:00", out: false, time: "12:00" },
  ],
  4: [
    { id: 1, text: "Маша, отправил документы", out: true, time: "Вт 10:00", read: true },
    { id: 2, text: "Спасибо большое!", out: false, time: "Вт 10:05" },
  ],
  5: [
    { id: 1, text: "Привет! Когда будет готово?", out: false, time: "Пн 09:30" },
  ],
  6: [
    { id: 1, text: "Новые макеты загружены в облако", out: false, time: "Вс 18:00" },
  ],
};

type Tab = "chats" | "contacts" | "notifications" | "gallery" | "search" | "profile";

const NOTIFICATIONS = [
  { id: 1, icon: "MessageCircle", text: "Алиса прислала 3 новых сообщения", time: "14:32", color: "#a855f7" },
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
  const [activeChatId, setActiveChatId] = useState<number | null>(1);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState(MESSAGES);
  const [showEncryptBadge, setShowEncryptBadge] = useState(true);

  const activeChat = CONTACTS.find((c) => c.id === activeChatId);
  const chatMessages = activeChatId ? messages[activeChatId] || [] : [];

  const sendMessage = () => {
    if (!inputText.trim() || !activeChatId) return;
    const newMsg = {
      id: Date.now(),
      text: inputText,
      out: true,
      time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      read: false,
    };
    setMessages((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg],
    }));
    setInputText("");
  };

  const filteredContacts = CONTACTS.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs: { id: Tab; icon: string; label: string; badge?: number }[] = [
    { id: "chats", icon: "MessageCircle", label: "Чаты", badge: 16 },
    { id: "contacts", icon: "Users", label: "Контакты" },
    { id: "notifications", icon: "Bell", label: "Уведомления", badge: 4 },
    { id: "gallery", icon: "Image", label: "Галерея" },
    { id: "search", icon: "Search", label: "Поиск" },
    { id: "profile", icon: "User", label: "Профиль" },
  ];

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background font-golos">
      {/* Ambient orbs */}
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
                {tab.badge && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full gradient-btn text-[9px] font-bold text-white px-1">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-3 pb-4">

            {activeTab === "chats" && (
              <div className="space-y-1">
                {filteredContacts.map((contact, i) => (
                  <button
                    key={contact.id}
                    onClick={() => { setActiveChatId(contact.id); }}
                    className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all ${
                      activeChatId === contact.id
                        ? "bg-white/[0.08] border border-white/[0.08]"
                        : "hover:bg-white/[0.04]"
                    }`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="relative shrink-0">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${contact.color}cc, ${contact.color}66)`, border: `1px solid ${contact.color}33` }}
                      >
                        {contact.avatar}
                      </div>
                      {contact.online && (
                        <span className="online-pulse absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white/90 truncate">{contact.name}</span>
                        <span className="text-[11px] text-white/30 ml-2 shrink-0">{contact.time}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs text-white/40 truncate">{contact.lastMsg}</span>
                        {contact.unread > 0 && (
                          <span className="ml-2 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full gradient-btn text-[10px] font-bold text-white px-1">
                            {contact.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {activeTab === "contacts" && (
              <div className="animate-fade-in">
                <p className="text-xs text-white/30 font-medium mb-3 px-1">КОНТАКТЫ · {CONTACTS.length}</p>
                <div className="space-y-1">
                  {CONTACTS.map((c) => (
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
                <p className="text-xs text-white/25 px-1 mb-3">НЕДАВНИЕ ЗАПРОСЫ</p>
                {["Алиса", "Команда Серж", "встреча"].map((q) => (
                  <div key={q} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.04] cursor-pointer transition-all">
                    <Icon name="Clock" size={14} className="text-white/25" />
                    <span className="text-sm text-white/50">{q}</span>
                  </div>
                ))}
                <p className="text-xs text-white/25 px-1 mt-4 mb-3">РЕКОМЕНДАЦИИ</p>
                {CONTACTS.slice(0, 3).map((c) => (
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
                  <p className="text-xs text-white/35 mt-0.5">@username</p>
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
        {activeChat ? (
          <>
            {/* Chat header */}
            <header className="glass-strong border-b border-white/[0.06] px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${activeChat.color}cc, ${activeChat.color}55)` }}
                  >
                    {activeChat.avatar}
                  </div>
                  {activeChat.online && (
                    <span className="online-pulse absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-background" />
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-white/95">{activeChat.name}</h2>
                  <p className="text-xs text-white/35">
                    {activeChat.isGroup ? "групповой чат · 5 участников" : activeChat.online ? "в сети" : "был(а) недавно"}
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
                  {[
                    { icon: "Phone" },
                    { icon: "Video" },
                    { icon: "MoreVertical" },
                  ].map((btn) => (
                    <button
                      key={btn.icon}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                    >
                      <Icon name={btn.icon} size={16} />
                    </button>
                  ))}
                </div>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
              {chatMessages.map((msg, i) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.out ? "justify-end" : "justify-start"} animate-fade-in`}
                  style={{ animationDelay: `${i * 30}ms` }}
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
                    <div className={`px-4 py-2.5 ${msg.out ? "msg-bubble-out text-white" : "msg-bubble-in text-white/85"}`}>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                    <div className={`flex items-center gap-1 mt-1 px-1 ${msg.out ? "justify-end" : "justify-start"}`}>
                      <span className="text-[10px] text-white/25">{msg.time}</span>
                      {msg.out && (
                        <Icon name={msg.read ? "CheckCheck" : "Check"} size={12} className={msg.read ? "text-purple-400" : "text-white/25"} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="glass-strong border-t border-white/[0.06] px-4 py-4">
              <div className="flex items-end gap-3">
                <div className="flex gap-1">
                  {["Paperclip", "Image", "Smile"].map((icon) => (
                    <button
                      key={icon}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl text-white/30 hover:text-purple-400 hover:bg-purple-400/[0.08] transition-all"
                    >
                      <Icon name={icon} size={18} />
                    </button>
                  ))}
                </div>

                <div className="flex-1 flex items-end gap-3 rounded-2xl bg-white/[0.05] border border-white/[0.07] px-4 py-3 focus-within:border-purple-500/40 transition-all">
                  <textarea
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none"
                    placeholder="Сообщение..."
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
                  disabled={!inputText.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl gradient-btn text-white shadow-lg shadow-purple-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:-translate-y-0.5"
                >
                  <Icon name="Send" size={16} />
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
    </div>
  );
}
