import { Chat, BotInfo, AuthUser } from "./types";
import GroupMembersHeader from "./groupMembers/GroupMembersHeader";
import GroupMembersTabs from "./groupMembers/GroupMembersTabs";
import GroupMembersContent from "./groupMembers/GroupMembersContent";
import { useGroupMembers } from "./groupMembers/useGroupMembers";

interface GroupMembersModalProps {
  chat: Chat;
  authUser: AuthUser | null;
  installedBotUsernames: string[];
  onInstallBot: (bot: BotInfo) => void;
  onClose: () => void;
  onGroupChanged?: () => void;
  onLeft?: () => void;
  onOpenProfile?: (userId: number) => void;
}

export default function GroupMembersModal({ chat, authUser, installedBotUsernames, onInstallBot, onClose, onGroupChanged, onLeft, onOpenProfile }: GroupMembersModalProps) {
  const g = useGroupMembers({ chat, authUser, onGroupChanged, onLeft });

  return (
    <div
      className="fixed inset-0 z-[93] flex items-center justify-center overlay-safe"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-modal rounded-3xl overflow-hidden flex flex-col animate-fade-in"
        style={{ background: "hsl(var(--popover) / 0.98)", border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <GroupMembersHeader
          chat={chat}
          groupAvatar={g.groupAvatar}
          groupName={g.groupName}
          membersCount={g.members.length}
          onClose={onClose}
        />

        <GroupMembersTabs
          tab={g.tab}
          setTab={g.setTab}
          canManage={g.canManage}
          isLocalChat={g.isLocalChat}
          search={g.search}
          setSearch={g.setSearch}
          setError={g.setError}
          setMenuFor={g.setMenuFor}
        />

        <GroupMembersContent
          chat={chat}
          authUser={authUser}
          installedBotUsernames={installedBotUsernames}
          onInstallBot={onInstallBot}
          onOpenProfile={onOpenProfile}
          g={g}
        />
      </div>
    </div>
  );
}
