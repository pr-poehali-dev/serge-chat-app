import { Chat, Tab, AuthUser, NotificationItem, FoundMessage } from "../types";
import NotificationsTab from "./NotificationsTab";
import GalleryTab from "./GalleryTab";
import SearchTab from "./SearchTab";
import ProfileTab from "./ProfileTab";

interface MiscTabsProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  setActiveChatId: (id: number) => void;
  chats: Chat[];
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

export default function MiscTabs({
  activeTab,
  setActiveTab,
  setActiveChatId,
  chats,
  authUser,
  onUpdateProfile,
  onLogout,
  onAvatarUpdated,
  notifications,
  onStartChatWithUser,
  onSetChatNotify,
  onMoodSaved,
  onOpenFoundMessage,
}: MiscTabsProps) {
  return (
    <>
      <NotificationsTab activeTab={activeTab} notifications={notifications} />

      <GalleryTab activeTab={activeTab} authUser={authUser} chats={chats} onOpenFoundMessage={onOpenFoundMessage} />

      <SearchTab
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setActiveChatId={setActiveChatId}
        chats={chats}
        authUser={authUser}
        onStartChatWithUser={onStartChatWithUser}
        onOpenFoundMessage={onOpenFoundMessage}
      />

      <ProfileTab
        activeTab={activeTab}
        chats={chats}
        authUser={authUser}
        onUpdateProfile={onUpdateProfile}
        onLogout={onLogout}
        onAvatarUpdated={onAvatarUpdated}
        onSetChatNotify={onSetChatNotify}
        onMoodSaved={onMoodSaved}
      />
    </>
  );
}
