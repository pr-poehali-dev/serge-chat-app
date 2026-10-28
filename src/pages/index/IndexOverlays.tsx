import { Dispatch, SetStateAction } from "react";
import { IncomingCall, CallScreen, GroupCallScreen } from "@/components/messenger/CallOverlays";
import BotStore from "@/components/messenger/BotStore";
import CreateGroupModal from "@/components/messenger/CreateGroupModal";
import CreateTopicModal from "@/components/messenger/CreateTopicModal";
import GroupMembersModal from "@/components/messenger/GroupMembersModal";
import ReadByModal from "@/components/messenger/chat/ReadByModal";
import CreatePollModal from "@/components/messenger/polls/CreatePollModal";
import ProfileSheet from "@/components/messenger/profile/ProfileSheet";
import ChatBackgroundPicker from "@/components/messenger/background/ChatBackgroundPicker";
import { AuthUser, Chat, Tab } from "@/components/messenger/types";
import { useBotsAndGroups } from "./useBotsAndGroups";
import { useMessaging } from "./useMessaging";
import { useCall } from "./useCall";
import { useGroupCall } from "./useGroupCall";

interface IndexOverlaysProps {
  chats: Chat[];
  setChats: Dispatch<SetStateAction<Chat[]>>;
  activeChat: Chat | undefined;
  setActiveChatId: (id: number | null) => void;
  setActiveTab: Dispatch<SetStateAction<Tab>>;
  authUser: AuthUser | null;
  reloadChats: () => Promise<void>;
  bg: ReturnType<typeof useBotsAndGroups>;
  msg: ReturnType<typeof useMessaging>;
  callCtl: ReturnType<typeof useCall>;
  groupCtl: ReturnType<typeof useGroupCall>;
  pollOpen: boolean;
  setPollOpen: Dispatch<SetStateAction<boolean>>;
  profileUserId: number | null;
  setProfileUserId: Dispatch<SetStateAction<number | null>>;
  groupInfoOpen: boolean;
  setGroupInfoOpen: Dispatch<SetStateAction<boolean>>;
  readByMessageId: number | null;
  setReadByMessageId: Dispatch<SetStateAction<number | null>>;
  bgPickerOpen: boolean;
  setBgPickerOpen: Dispatch<SetStateAction<boolean>>;
}

export default function IndexOverlays({
  chats,
  setChats,
  activeChat,
  setActiveChatId,
  setActiveTab,
  authUser,
  reloadChats,
  bg,
  msg,
  callCtl,
  groupCtl,
  pollOpen,
  setPollOpen,
  profileUserId,
  setProfileUserId,
  groupInfoOpen,
  setGroupInfoOpen,
  readByMessageId,
  setReadByMessageId,
  bgPickerOpen,
  setBgPickerOpen,
}: IndexOverlaysProps) {
  return (
    <>
      {/* Bot store modal */}
      {bg.botStoreOpen && (
        <BotStore
          installedUsernames={bg.bots.map((b) => bg.botInfoRef.current[b.id]?.username).filter(Boolean) as string[]}
          onInstall={bg.installBot}
          onClose={() => bg.setBotStoreOpen(false)}
        />
      )}

      {/* Create group modal */}
      {bg.createGroupOpen && (
        <CreateGroupModal
          contacts={chats.filter((c) => !c.isGroup && !c.isBot && c.contactUserId != null)}
          onCreate={(name, chatIds) =>
            bg.createGroup(
              name,
              chats
                .filter((c) => chatIds.includes(c.id) && c.contactUserId != null)
                .map((c) => c.contactUserId as number)
            )
          }
          onClose={() => bg.setCreateGroupOpen(false)}
        />
      )}

      {/* Create topic modal */}
      {bg.createTopicOpen && (
        <CreateTopicModal
          onCreate={bg.createTopic}
          onClose={() => bg.setCreateTopicOpen(false)}
        />
      )}

      {/* Group members modal */}
      {bg.groupMembersOpen && activeChat?.isGroup && (
        <GroupMembersModal
          chat={activeChat}
          authUser={authUser}
          installedBotUsernames={bg.bots.map((b) => bg.botInfoRef.current[b.id]?.username).filter(Boolean) as string[]}
          onInstallBot={bg.installBot}
          onClose={() => bg.setGroupMembersOpen(false)}
          onGroupChanged={reloadChats}
          onOpenProfile={(id) => setProfileUserId(id)}
          onLeft={() => {
            bg.setGroupMembersOpen(false);
            if (activeChat) {
              const leftId = activeChat.id;
              setChats((prev) => prev.filter((c) => c.id !== leftId));
              setActiveChatId(null);
              reloadChats();
            }
          }}
        />
      )}

      {callCtl.call?.incoming && callCtl.call.phase === "ringing" && (
        <IncomingCall call={callCtl.call} onAccept={callCtl.accept} onDecline={callCtl.decline} />
      )}

      {callCtl.call && !(callCtl.call.incoming && callCtl.call.phase === "ringing") && (
        <CallScreen
          call={callCtl.call}
          localStream={callCtl.localStream}
          remoteStream={callCtl.remoteStream}
          muted={callCtl.muted}
          camOff={callCtl.camOff}
          speakerOff={callCtl.speakerOff}
          onToggleMute={callCtl.toggleMute}
          onToggleCam={callCtl.toggleCam}
          onToggleSpeaker={callCtl.toggleSpeaker}
          onEnd={callCtl.hangUp}
        />
      )}

      {pollOpen && (
        <CreatePollModal onCreate={msg.createPoll} onClose={() => setPollOpen(false)} />
      )}

      {authUser && (profileUserId !== null || (groupInfoOpen && activeChat?.isGroup)) && (
        <ProfileSheet
          sessionId={authUser.sessionId}
          userId={profileUserId ?? undefined}
          group={
            profileUserId === null && activeChat?.isGroup
              ? {
                  name: activeChat.name,
                  description: activeChat.description || "",
                  avatar: activeChat.avatar,
                  color: activeChat.color,
                  avatarUrl: activeChat.avatarUrl,
                  memberCount: activeChat.memberCount,
                  myRole: activeChat.myRole,
                }
              : undefined
          }
          onClose={() => {
            setProfileUserId(null);
            setGroupInfoOpen(false);
          }}
          onWrite={(id) => msg.startChatWithUser(id)}
          onOpenChat={(id) => {
            setActiveChatId(id);
            setActiveTab("chats");
          }}
          onOpenMembers={() => bg.setGroupMembersOpen(true)}
        />
      )}

      {readByMessageId !== null && authUser && (
        <ReadByModal messageId={readByMessageId} sessionId={authUser.sessionId} onClose={() => setReadByMessageId(null)} />
      )}

      {bgPickerOpen && activeChat && activeChat.id > 0 && (
        <ChatBackgroundPicker
          current={activeChat.chatBg ?? null}
          isGroup={activeChat.isGroup}
          onSelect={(bg) => msg.setChatBackground(activeChat.id, bg)}
          onUpload={(file) => msg.uploadChatBackground(activeChat.id, file)}
          onClose={() => setBgPickerOpen(false)}
        />
      )}

      {groupCtl.call && authUser && (
        <GroupCallScreen
          call={groupCtl.call}
          myUserId={authUser.id}
          localStream={groupCtl.localStream}
          remoteStreams={groupCtl.remoteStreams}
          muted={groupCtl.muted}
          camOff={groupCtl.camOff}
          speakerOff={groupCtl.speakerOff}
          onToggleMute={groupCtl.toggleMute}
          onToggleCam={groupCtl.toggleCam}
          onToggleSpeaker={groupCtl.toggleSpeaker}
          onLeave={groupCtl.leave}
        />
      )}

      {(callCtl.error || groupCtl.error) && (
        <div className="fixed left-1/2 top-4 z-[120] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-fade-in">
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/15 px-4 py-3 backdrop-blur-xl">
            <p className="flex-1 text-sm text-red-200">{callCtl.error || groupCtl.error}</p>
            <button onClick={() => { callCtl.clearError(); groupCtl.clearError(); }} className="text-red-200/70 hover:text-red-100" aria-label="Закрыть">
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
