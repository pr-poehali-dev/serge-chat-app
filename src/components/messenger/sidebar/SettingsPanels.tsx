import { AuthUser, Chat } from "../types";
import NotificationsPanel from "./NotificationsPanel";
import PrivacyPanel from "./PrivacyPanel";
import AppearancePanel from "./AppearancePanel";

export { isQuietNow, readNotifyPrefs } from "./NotificationsPanel";

export type SettingsSection = "notifications" | "privacy" | "appearance";

interface SettingsPanelsProps {
  section: SettingsSection;
  authUser: AuthUser | null;
  onBack: () => void;
  chats: Chat[];
  onSetChatNotify: (chatId: number, enabled: boolean) => void;
}

export default function SettingsPanels({ section, authUser, onBack, chats, onSetChatNotify }: SettingsPanelsProps) {
  if (section === "notifications")
    return <NotificationsPanel onBack={onBack} authUser={authUser} chats={chats} onSetChatNotify={onSetChatNotify} />;
  if (section === "privacy") return <PrivacyPanel authUser={authUser} onBack={onBack} />;
  return <AppearancePanel onBack={onBack} />;
}
