import { Chat, AuthUser, BotInfo } from "../types";
import MembersTab from "./MembersTab";
import { AddPeopleTab, AddBotsTab } from "./AddTabs";
import GroupSettingsTab from "./GroupSettingsTab";
import ConfirmDialog from "./ConfirmDialog";
import { useGroupMembers } from "./useGroupMembers";

interface GroupMembersContentProps {
  chat: Chat;
  authUser: AuthUser | null;
  installedBotUsernames: string[];
  onInstallBot: (bot: BotInfo) => void;
  onOpenProfile?: (userId: number) => void;
  g: ReturnType<typeof useGroupMembers>;
}

export default function GroupMembersContent({
  chat,
  authUser,
  installedBotUsernames,
  onInstallBot,
  onOpenProfile,
  g,
}: GroupMembersContentProps) {
  return (
    <>
      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {g.tab === "members" && (
          <MembersTab
            loadingMembers={g.loadingMembers}
            members={g.members}
            isLocalChat={g.isLocalChat}
            isOwner={g.isOwner}
            authUser={authUser}
            onOpenProfile={onOpenProfile}
            menuFor={g.menuFor}
            setMenuFor={g.setMenuFor}
            canRemove={g.canRemove}
            setConfirm={g.setConfirm}
            removingId={g.removingId}
            changeRole={g.changeRole}
          />
        )}

        {g.tab === "add-people" && (
          <AddPeopleTab
            availableUsers={g.availableUsers}
            isLocalChat={g.isLocalChat}
            addingId={g.addingId}
            addMember={g.addMember}
          />
        )}

        {g.tab === "settings" && (
          <GroupSettingsTab
            chat={chat}
            groupAvatar={g.groupAvatar}
            groupName={g.groupName}
            setGroupName={g.setGroupName}
            groupDesc={g.groupDesc}
            setGroupDesc={g.setGroupDesc}
            canManage={g.canManage}
            isLocalChat={g.isLocalChat}
            busy={g.busy}
            avatarInputRef={g.avatarInputRef}
            changeAvatar={g.changeAvatar}
            removeAvatar={g.removeAvatar}
            saveInfo={g.saveInfo}
            setConfirm={g.setConfirm}
          />
        )}

        {g.tab === "add-bots" && (
          <AddBotsTab
            filteredBots={g.filteredBots}
            installedBotUsernames={installedBotUsernames}
            onInstallBot={onInstallBot}
          />
        )}
      </div>

      {g.error && (
        <div className="border-t border-red-500/20 bg-red-500/10 px-5 py-2.5">
          <p className="text-xs text-red-300">{g.error}</p>
        </div>
      )}

      {g.confirm && (
        <ConfirmDialog
          confirm={g.confirm}
          isOwner={g.isOwner}
          busy={g.busy}
          setConfirm={g.setConfirm}
          transferOwner={g.transferOwner}
          removeMember={g.removeMember}
          leaveGroup={g.leaveGroup}
        />
      )}
    </>
  );
}
