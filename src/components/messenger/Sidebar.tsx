import { useState } from "react";
import { Chat, ChatFolder, Tab, AuthUser, NotificationItem, FoundMessage } from "./types";
import SidebarHeader from "./sidebar/SidebarHeader";
import ChatsList from "./sidebar/ChatsList";
import ChatFolderTabs, { FolderFilter } from "./sidebar/ChatFolderTabs";
import ContactsAndBots from "./sidebar/ContactsAndBots";
import MiscTabs from "./sidebar/MiscTabs";

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  activeChatId: number | null;
  setActiveChatId: (id: number) => void;
  isMobile?: boolean;
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
  onTogglePinChat: (id: number) => void;
  folders: ChatFolder[];
  onCreateFolder: (name: string) => Promise<string | null>;
  onRenameFolder: (id: number, name: string) => Promise<string | null>;
  onDeleteFolder: (id: number) => Promise<string | null>;
  onMoveChatToFolder: (chatId: number, folderId: number | null) => void;
  authUser: AuthUser | null;
  onUpdateProfile: (login: string, firstName: string, lastName: string) => Promise<string | null>;
  onLogout: () => void;
  onAvatarUpdated: (user: AuthUser) => void;
  notifications: NotificationItem[];
  onStartChatWithUser: (userId: number) => Promise<string | null>;
  onSetChatNotify: (chatId: number, enabled: boolean) => void;
  onMoodSaved?: (mood: { moodEmoji: string; moodText: string; bio: string }) => void;
  onOpenFoundMessage?: (found: FoundMessage, query: string) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  activeChatId,
  setActiveChatId,
  isMobile,
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
  onTogglePinChat,
  folders,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveChatToFolder,
  authUser,
  onUpdateProfile,
  onLogout,
  onAvatarUpdated,
  notifications,
  onStartChatWithUser,
  onSetChatNotify,
  onMoodSaved,
  onOpenFoundMessage,
}: SidebarProps) {
  const [botToDelete, setBotToDelete] = useState<Chat | null>(null);
  const [groupToLeave, setGroupToLeave] = useState<Chat | null>(null);
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const activeFolder: FolderFilter = folderFilter !== "all" && !folders.some((f) => f.id === folderFilter) ? "all" : folderFilter;
  const visibleChats = activeFolder === "all" ? filteredChats : filteredChats.filter((c) => c.folderId === activeFolder);

  return (
    <aside
      className="relative z-10 flex h-full min-w-0 shrink-0 flex-col w-full"
      style={{ width: isMobile ? "100%" : "var(--sidebar-width)" }}
    >
      <div className="glass-strong flex h-full flex-col border-r border-fg/[0.06]">
        <SidebarHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          chats={chats}
          bots={bots}
          unreadNotifications={notifications.filter((n) => !n.read).length}
          onOpenCreateGroup={onOpenCreateGroup}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4 safe-bottom">
          {/* CHATS */}
          {activeTab === "chats" && (
            <>
              <ChatFolderTabs
                folders={folders}
                chats={chats}
                active={activeFolder}
                onSelect={setFolderFilter}
                onCreate={onCreateFolder}
                onRename={onRenameFolder}
                onDelete={onDeleteFolder}
              />
              <ChatsList
                activeChatId={activeChatId}
                setActiveChatId={setActiveChatId}
                loadingChats={loadingChats}
                filteredChats={visibleChats}
                onRequestLeaveGroup={setGroupToLeave}
                onTogglePinChat={onTogglePinChat}
                folders={folders}
                onMoveChatToFolder={onMoveChatToFolder}
                emptyText={activeFolder !== "all" ? "В этой папке пока нет чатов. Нажмите значок папки у чата, чтобы добавить его сюда." : undefined}
              />
            </>
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
            authUser={authUser}
            onUpdateProfile={onUpdateProfile}
            onLogout={onLogout}
            onAvatarUpdated={onAvatarUpdated}
            notifications={notifications}
            onStartChatWithUser={onStartChatWithUser}
            onSetChatNotify={onSetChatNotify}
            onMoodSaved={onMoodSaved}
            onOpenFoundMessage={onOpenFoundMessage}
          />
        </div>
      </div>

      {/* Delete bot confirmation */}
      {botToDelete && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center overlay-safe"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          onClick={() => setBotToDelete(null)}
        >
          <div
            className="w-full max-w-xs rounded-3xl overflow-hidden animate-fade-in p-5"
            style={{ background: "hsl(var(--popover) / 0.98)", border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))" }}
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
                <p className="text-sm font-semibold text-fg/90">Удалить бота?</p>
                <p className="text-xs text-fg/40 mt-1">
                  {botToDelete.name} и вся история переписки будут удалены безвозвратно
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setBotToDelete(null)}
                className="flex-1 rounded-xl bg-fg/[0.06] py-2.5 text-sm text-fg/60 hover:bg-fg/[0.1] transition-all"
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
          className="fixed inset-0 z-[95] flex items-center justify-center overlay-safe"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          onClick={() => setGroupToLeave(null)}
        >
          <div
            className="w-full max-w-xs rounded-3xl overflow-hidden animate-fade-in p-5"
            style={{ background: "hsl(var(--popover) / 0.98)", border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))" }}
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
                <p className="text-sm font-semibold text-fg/90">Выйти из группы?</p>
                <p className="text-xs text-fg/40 mt-1">
                  «{groupToLeave.name}» будет удалена из списка чатов вместе с историей переписки
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setGroupToLeave(null)}
                className="flex-1 rounded-xl bg-fg/[0.06] py-2.5 text-sm text-fg/60 hover:bg-fg/[0.1] transition-all"
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