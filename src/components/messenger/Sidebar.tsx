import Icon from "@/components/ui/icon";
import { Chat, Tab } from "./types";

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

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  activeChatId: number | null;
  setActiveChatId: (id: number) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  chats: Chat[];
  loadingChats: boolean;
  filteredChats: Chat[];
  bots: Chat[];
  onOpenBotStore: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  activeChatId,
  setActiveChatId,
  searchQuery,
  setSearchQuery,
  chats,
  loadingChats,
  filteredChats,
  bots,
  onOpenBotStore,
}: SidebarProps) {
  const tabs: { id: Tab; icon: string; badge?: number }[] = [
    { id: "chats", icon: "MessageCircle", badge: chats.reduce((s, c) => s + c.unread, 0) || undefined },
    { id: "contacts", icon: "Users" },
    { id: "bots", icon: "Bot", badge: bots.length || undefined },
    { id: "notifications", icon: "Bell", badge: 4 },
    { id: "gallery", icon: "Image" },
    { id: "search", icon: "Search" },
    { id: "profile", icon: "User" },
  ];

  return (
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

          {/* BOTS */}
          {activeTab === "bots" && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-xs text-white/30 font-medium">БОТЫ · {bots.length}</p>
              </div>
              <button
                onClick={onOpenBotStore}
                className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 mb-2 border border-dashed border-purple-400/30 hover:border-purple-400/60 hover:bg-purple-400/[0.06] transition-all"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                  <Icon name="Plus" size={16} />
                </div>
                <span className="text-sm font-medium text-white/70">Добавить бота из Telegram</span>
              </button>
              <div className="space-y-1">
                {bots.length === 0 ? (
                  <p className="text-center text-xs text-white/25 py-6">У вас пока нет ботов</p>
                ) : (
                  bots.map((bot) => (
                    <button
                      key={bot.id}
                      onClick={() => { setActiveChatId(bot.id); setActiveTab("chats"); }}
                      className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-white/[0.04] transition-all"
                    >
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg"
                        style={{ background: `${bot.color}22`, border: `1px solid ${bot.color}33` }}
                      >
                        {bot.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-white/90 truncate block">{bot.name}</span>
                        <span className="text-xs text-white/35 truncate block">{bot.lastMsg}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
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
  );
}