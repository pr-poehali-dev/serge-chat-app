import { useState } from "react";
import { Chat, Tab } from "./types";
import SidebarHeader from "./sidebar/SidebarHeader";
import ChatsList from "./sidebar/ChatsList";
import ContactsAndBots from "./sidebar/ContactsAndBots";
import MiscTabs from "./sidebar/MiscTabs";

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
  onDeleteBot: (id: number) => void;
  onOpenCreateGroup: () => void;
  onLeaveGroup: (id: number) => void;
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
  onDeleteBot,
  onOpenCreateGroup,
  onLeaveGroup,
}: SidebarProps) {
  const [botToDelete, setBotToDelete] = useState<Chat | null>(null);
  const [groupToLeave, setGroupToLeave] = useState<Chat | null>(null);

  return (
    <aside className="relative z-10 flex h-full flex-col" style={{ width: "var(--sidebar-width)" }}>
      <div className="glass-strong flex h-full flex-col border-r border-white/[0.06]">
        <SidebarHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          chats={chats}
          bots={bots}
          onOpenCreateGroup={onOpenCreateGroup}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {/* CHATS */}
          {activeTab === "chats" && (
            <ChatsList
              activeChatId={activeChatId}
              setActiveChatId={setActiveChatId}
              loadingChats={loadingChats}
              filteredChats={filteredChats}
              onRequestLeaveGroup={setGroupToLeave}
            />
          )}

          <ContactsAndBots
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setActiveChatId={setActiveChatId}
            chats={chats}
            bots={bots}
            onOpenBotStore={onOpenBotStore}
            onOpenCreateGroup={onOpenCreateGroup}
            onRequestDeleteBot={setBotToDelete}
          />

          <MiscTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setActiveChatId={setActiveChatId}
            chats={chats}
          />
        </div>
      </div>

      {/* Delete bot confirmation */}
      {botToDelete && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          onClick={() => setBotToDelete(null)}
        >
          <div
            className="w-full max-w-xs rounded-3xl overflow-hidden animate-fade-in p-5"
            style={{ background: "rgba(14,8,28,0.98)", border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg"
                style={{ background: `${botToDelete.color}22`, border: `1px solid ${botToDelete.color}33` }}
              >
                {botToDelete.avatar}
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">Удалить бота?</p>
                <p className="text-xs text-white/40 mt-1">
                  {botToDelete.name} и вся история переписки будут удалены безвозвратно
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setBotToDelete(null)}
                className="flex-1 rounded-xl bg-white/[0.06] py-2.5 text-sm text-white/60 hover:bg-white/[0.1] transition-all"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  onDeleteBot(botToDelete.id);
                  setBotToDelete(null);
                }}
                className="flex-1 rounded-xl bg-red-500/20 border border-red-500/30 py-2.5 text-sm text-red-400 hover:bg-red-500/30 transition-all"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave group confirmation */}
      {groupToLeave && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          onClick={() => setGroupToLeave(null)}
        >
          <div
            className="w-full max-w-xs rounded-3xl overflow-hidden animate-fade-in p-5"
            style={{ background: "rgba(14,8,28,0.98)", border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${groupToLeave.color}cc, ${groupToLeave.color}55)` }}
              >
                {groupToLeave.avatar}
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">Выйти из группы?</p>
                <p className="text-xs text-white/40 mt-1">
                  «{groupToLeave.name}» будет удалена из списка чатов вместе с историей переписки
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setGroupToLeave(null)}
                className="flex-1 rounded-xl bg-white/[0.06] py-2.5 text-sm text-white/60 hover:bg-white/[0.1] transition-all"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  onLeaveGroup(groupToLeave.id);
                  setGroupToLeave(null);
                }}
                className="flex-1 rounded-xl bg-red-500/20 border border-red-500/30 py-2.5 text-sm text-red-400 hover:bg-red-500/30 transition-all"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
