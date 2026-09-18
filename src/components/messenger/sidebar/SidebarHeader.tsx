import Icon from "@/components/ui/icon";
import { Chat, Tab } from "../types";

interface SidebarHeaderProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  chats: Chat[];
  bots: Chat[];
  unreadNotifications: number;
  onOpenCreateGroup: () => void;
}

export default function SidebarHeader({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  chats,
  bots,
  unreadNotifications,
  onOpenCreateGroup,
}: SidebarHeaderProps) {
  const tabs: { id: Tab; icon: string; badge?: number }[] = [
    { id: "chats", icon: "MessageCircle", badge: chats.reduce((s, c) => s + c.unread, 0) || undefined },
    { id: "contacts", icon: "Users" },
    { id: "bots", icon: "Bot", badge: bots.length || undefined },
    { id: "notifications", icon: "Bell", badge: unreadNotifications || undefined },
    { id: "gallery", icon: "Image" },
    { id: "search", icon: "Search" },
    { id: "profile", icon: "User" },
  ];

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-btn shadow-lg shadow-purple-500/30">
          <span className="text-lg font-black text-white">Т</span>
        </div>
        <div>
          <h1 className="text-lg font-bold gradient-text leading-none">Трынделка</h1>
          <p className="text-[11px] text-white/35 mt-0.5">мессенджер</p>
        </div>
        <div className="ml-auto">
          <button
            onClick={onOpenCreateGroup}
            title="Создать группу"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
          >
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
    </>
  );
}