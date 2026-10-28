import { useState, useRef, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppHeight } from "@/hooks/use-app-height";
import { IncomingCall, CallScreen, GroupCallScreen } from "@/components/messenger/CallOverlays";
import Sidebar from "@/components/messenger/Sidebar";
import ChatArea from "@/components/messenger/ChatArea";
import BotStore from "@/components/messenger/BotStore";
import CreateGroupModal from "@/components/messenger/CreateGroupModal";
import CreateTopicModal from "@/components/messenger/CreateTopicModal";
import AuthScreen from "@/components/messenger/AuthScreen";
import GroupMembersModal from "@/components/messenger/GroupMembersModal";
import ForwardModal from "@/components/messenger/chat/ForwardModal";
import ReadByModal from "@/components/messenger/chat/ReadByModal";
import CreatePollModal from "@/components/messenger/polls/CreatePollModal";
import ProfileSheet from "@/components/messenger/profile/ProfileSheet";
import ChatBackgroundPicker from "@/components/messenger/background/ChatBackgroundPicker";
import PollLinkModal from "@/components/messenger/polls/PollLinkModal";
import { replyLabel } from "@/components/messenger/chat/ReplyQuote";
import { Chat, Message, Tab, PollData, FoundMessage } from "@/components/messenger/types";
import { EMOJI_CATEGORIES, GIF_CATEGORIES, API_CHATS } from "./index/config";
import { useAuth } from "./index/useAuth";
import { useComposer } from "./index/useComposer";
import { useBotsAndGroups } from "./index/useBotsAndGroups";
import { useMessaging } from "./index/useMessaging";
import { useCall } from "./index/useCall";
import { useGroupCall } from "./index/useGroupCall";
import { useScheduled } from "./index/useScheduled";
import { useDraft } from "./index/useDraft";

export default function Index() {
  const isMobile = useIsMobile();
  useAppHeight();
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("chats");
  const [activeChatId, setActiveChatIdRaw] = useState<number | null>(null);
  const setActiveChatId = (id: number | null) => {
    setActiveChatIdRaw(id);
    setMobileShowChat(id !== null);
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [showEncryptBadge, setShowEncryptBadge] = useState(true);

  const [chats, setChats] = useState<Chat[]>([]);
  const botsRef = useRef<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [forwardSource, setForwardSource] = useState<Message | null>(null);
  const [forwardMany, setForwardMany] = useState<number[] | null>(null);
  const [forwardPoll, setForwardPoll] = useState<PollData | null>(null);
  const [pollCode, setPollCode] = useState<string | null>(null);
  const [foundFocus, setFoundFocus] = useState<{ messageId: number; query: string; nonce: number } | null>(null);
  const [pendingFound, setPendingFound] = useState<{ chatId: number; topicId: number | null; messageId: number; query: string } | null>(null);
  const [readByMessageId, setReadByMessageId] = useState<number | null>(null);
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);

  const {
    authUser,
    authLoading,
    handleAuthenticated,
    handleLogout,
    handleUpdateProfile,
    handleAvatarUpdated,
    handleMoodSaved,
    authHeaders,
  } = useAuth({ setChats, setActiveChatId });

  const composer = useComposer();
  const callCtl = useCall({ sessionId: authUser?.sessionId ?? null });
  const groupCtl = useGroupCall(authUser?.sessionId ?? null, authUser?.id ?? null);

  const reloadChats = async () => {
    if (!authUser) return;
    const res = await fetch(API_CHATS, { headers: authHeaders() });
    const data = await res.json();
    setChats(data.chats || []);
  };

  const activeChat = chats.find((c) => c.id === activeChatId) || botsRef.current.find((b) => b.id === activeChatId);
  const isGroupChat = !!activeChat?.isGroup;

  const bg = useBotsAndGroups({
    authHeaders,
    reloadChats,
    setChats,
    setMessages,
    activeChatId,
    setActiveChatId,
    setActiveTab,
    isGroupChat,
    inputText: composer.inputText,
    setInputText: composer.setInputText,
    attachments: composer.attachments,
    setAttachments: composer.setAttachments,
  });
  botsRef.current = bg.bots;

  const handleMobileBackToChats = () => {
    setMobileShowChat(false);
  };

  const isBotChat = bg.bots.some((b) => b.id === activeChatId);
  const displayMessages = isBotChat
    ? (bg.botMessages[activeChatId as number] || [])
    : messages;

  const msg = useMessaging({
    authUser,
    authHeaders,
    reloadChats,
    chats,
    setChats,
    messages,
    setMessages,
    activeChatId,
    setActiveChatId,
    setActiveChatIdRaw,
    activeTab,
    setActiveTab,
    isBotChat,
    isGroupChat,
    activeTopicId: bg.activeTopicId,
    setActiveTopicId: bg.setActiveTopicId,
    botMessages: bg.botMessages,
    setBotMessages: bg.setBotMessages,
    inputText: composer.inputText,
    setInputText: composer.setInputText,
    attachments: composer.attachments,
    setAttachments: composer.setAttachments,
    sendBotMessage: bg.sendBotMessage,
    onIncomingCallHint: callCtl.checkIncoming,
  });

  const realChatId = !isBotChat && activeChatId && activeChatId > 0 ? activeChatId : null;

  const scheduled = useScheduled({ authUser, authHeaders, chatId: realChatId, topicId: bg.activeTopicId });
  const scheduleFromInput = async (whenMs: number): Promise<string | null> => {
    const err = await scheduled.schedule(composer.inputText, whenMs);
    if (!err) composer.setInputText("");
    return err;
  };

  useDraft({
    userId: authUser?.id ?? null,
    chatId: realChatId,
    topicId: bg.activeTopicId,
    text: composer.inputText,
    setText: composer.setInputText,
    suspended: !!msg.editingMessage,
  });

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("poll");
    if (!code) return;
    setPollCode(code);
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const openFoundMessage = (found: FoundMessage, query: string) => {
    setPendingFound({ chatId: found.chatId, topicId: found.topicId ?? null, messageId: found.messageId, query });
    setActiveTab("chats");
    setActiveChatId(found.chatId);
  };

  useEffect(() => {
    if (!pendingFound || activeChatId !== pendingFound.chatId) return;
    if (bg.activeTopicId !== pendingFound.topicId) {
      bg.setActiveTopicId(pendingFound.topicId);
      return;
    }
    setFoundFocus({ messageId: pendingFound.messageId, query: pendingFound.query, nonce: Date.now() });
    setPendingFound(null);
  }, [pendingFound, activeChatId, bg.activeTopicId]);

  const filteredChats = chats.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="screen-full relative flex w-full items-center justify-center overflow-hidden bg-background font-golos">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-purple-400/50 animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!authUser) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="app-screen relative flex w-full overflow-hidden bg-background font-golos">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {(!isMobile || !mobileShowChat) && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeChatId={activeChatId}
          setActiveChatId={setActiveChatId}
          isMobile={isMobile}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          chats={chats}
          loadingChats={msg.loadingChats}
          filteredChats={filteredChats}
          bots={bg.bots}
          onOpenBotStore={() => bg.setBotStoreOpen(true)}
          onDeleteBot={bg.deleteBot}
          onOpenCreateGroup={() => bg.setCreateGroupOpen(true)}
          onLeaveGroup={bg.leaveGroup}
          onTogglePinChat={msg.togglePinChat}
          authUser={authUser}
          onUpdateProfile={handleUpdateProfile}
          onLogout={handleLogout}
          onAvatarUpdated={handleAvatarUpdated}
          notifications={msg.notifications}
          onStartChatWithUser={msg.startChatWithUser}
          onSetChatNotify={msg.setChatNotify}
          onMoodSaved={handleMoodSaved}
          onOpenFoundMessage={openFoundMessage}
        />
      )}

      {(!isMobile || mobileShowChat) && (
      <ChatArea
        activeChat={activeChat}
        sessionId={authUser?.sessionId ?? null}
        onSendSticker={!isBotChat && activeChatId && activeChatId > 0 ? msg.sendSticker : undefined}
        onCreatePoll={!isBotChat && activeChat?.isGroup && activeChat.id > 0 ? () => setPollOpen(true) : undefined}
        onVotePoll={!isBotChat ? msg.votePoll : undefined}
        onClosePoll={!isBotChat ? msg.closePoll : undefined}
        onOpenProfile={!isBotChat ? (id) => setProfileUserId(id) : undefined}
        onOpenChatInfo={
          !isBotChat && activeChat && activeChat.id > 0
            ? () => (activeChat.isGroup ? setGroupInfoOpen(true) : activeChat.contactUserId ? setProfileUserId(activeChat.contactUserId) : undefined)
            : undefined
        }
        onOpenBackground={!isBotChat && activeChat && activeChat.id > 0 ? () => setBgPickerOpen(true) : undefined}
        onOpenReadBy={!isBotChat ? (id) => setReadByMessageId(id) : undefined}
        onStartGroupCall={
          !isBotChat && activeChat?.isGroup && activeChat.id > 0 && !callCtl.call
            ? (isVideo) => groupCtl.startCall(activeChat.id, activeChat.name, isVideo)
            : undefined
        }
        activeGroupCall={
          !isBotChat && activeChat?.isGroup && !groupCtl.call
            ? msg.groupCalls.find((g) => g.chatId === activeChat.id) || null
            : null
        }
        onJoinGroupCall={() => {
          const g = msg.groupCalls.find((x) => x.chatId === activeChat?.id);
          if (g && activeChat) groupCtl.joinCall(g.callId, g.chatId, activeChat.name, g.isVideo);
        }}
        onStartCall={
          !isBotChat && activeChat && !activeChat.isGroup && activeChat.id > 0 && activeChat.contactUserId
            ? (isVideo) =>
                callCtl.startCall(activeChat.id, isVideo, {
                  name: activeChat.name,
                  avatar: activeChat.avatar,
                  color: activeChat.color,
                  avatarUrl: activeChat.avatarUrl,
                })
            : undefined
        }
        showEncryptBadge={showEncryptBadge}
        setShowEncryptBadge={setShowEncryptBadge}
        loadingMsgs={isBotChat ? false : msg.loadingMsgs}
        messages={displayMessages}
        botTyping={isBotChat ? bg.botTyping : false}
        messagesEndRef={msg.messagesEndRef}
        attachments={composer.attachments}
        setAttachments={composer.setAttachments}
        attachMenuOpen={composer.attachMenuOpen}
        setAttachMenuOpen={composer.setAttachMenuOpen}
        attachMenuRef={composer.attachMenuRef}
        fileInputRef={composer.fileInputRef}
        imageInputRef={composer.imageInputRef}
        handleFileSelect={composer.handleFileSelect}
        emojiPickerOpen={composer.emojiPickerOpen}
        setEmojiPickerOpen={composer.setEmojiPickerOpen}
        emojiPickerRef={composer.emojiPickerRef}
        emojiTab={composer.emojiTab}
        setEmojiTab={composer.setEmojiTab}
        EMOJI_CATEGORIES={EMOJI_CATEGORIES}
        GIF_CATEGORIES={GIF_CATEGORIES}
        gifSearch={composer.gifSearch}
        setGifSearch={composer.setGifSearch}
        filteredGifs={composer.filteredGifs}
        inputText={composer.inputText}
        setInputText={composer.setInputText}
        sendMessage={msg.sendMessage}
        sending={isBotChat ? false : msg.sending}
        topics={
          activeChatId
            ? [...(bg.groupTopics[activeChatId] || [])].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
            : []
        }
        activeTopicId={bg.activeTopicId}
        onSelectTopic={bg.setActiveTopicId}
        onOpenCreateTopic={() => bg.setCreateTopicOpen(true)}
        onTogglePinTopic={bg.togglePinTopic}
        onOpenGroupMembers={() => bg.setGroupMembersOpen(true)}
        currentUserId={authUser?.id}
        onToggleReaction={msg.toggleReaction}
        onBack={isMobile ? handleMobileBackToChats : undefined}
        onSendMedia={!isBotChat && activeChatId && activeChatId > 0 ? msg.sendMedia : undefined}
        onTranscribe={msg.transcribeMessage}
        replyTo={msg.replyTo}
        editingMessage={msg.editingMessage}
        sendError={msg.sendError}
        onReply={isBotChat ? undefined : msg.startReply}
        onEdit={isBotChat ? undefined : msg.startEdit}
        onRemove={isBotChat ? undefined : msg.removeMessage}
        onCancelContext={msg.cancelComposerContext}
        onPinMessage={isBotChat ? undefined : msg.pinMessage}
        onOpenPinned={isBotChat ? undefined : msg.openPinned}
        onForward={isBotChat ? undefined : setForwardSource}
        jumpRequest={msg.jumpRequest}
        onAddFiles={!isBotChat && activeChatId && activeChatId > 0 ? composer.addFiles : undefined}
        fileNotice={composer.fileNotice}
        onSendGif={!isBotChat && activeChatId && activeChatId > 0 ? msg.sendGif : undefined}
        onForwardPoll={!isBotChat ? setForwardPoll : undefined}
        onForwardSelected={isBotChat ? undefined : setForwardMany}
        onDeleteSelected={isBotChat ? undefined : msg.deleteMessages}
        onDeleteForMe={isBotChat ? undefined : (id) => { msg.deleteMessages([id]); }}
        scheduledItems={realChatId ? scheduled.items : undefined}
        onScheduleMessage={realChatId ? scheduleFromInput : undefined}
        onCancelScheduled={realChatId ? scheduled.cancel : undefined}
        foundFocus={foundFocus}
      />
      )}

      {forwardSource && (
        <ForwardModal
          preview={replyLabel({ text: forwardSource.text || forwardSource.fileName || "", kind: (forwardSource.kind || "text") as "text" })}
          chats={chats}
          currentChatId={activeChatId}
          onForward={(targetId) => msg.forwardMessage(forwardSource, targetId)}
          onClose={() => setForwardSource(null)}
        />
      )}

      {forwardMany && (
        <ForwardModal
          title="Переслать сообщения"
          preview={`Выбрано сообщений: ${forwardMany.length}`}
          chats={chats}
          currentChatId={activeChatId}
          onForward={(targetId) => msg.forwardMessages(forwardMany, targetId)}
          onClose={() => setForwardMany(null)}
        />
      )}

      {forwardPoll && (
        <ForwardModal
          title="Переслать опрос в группу"
          preview={forwardPoll.question}
          groupsOnly
          chats={chats}
          currentChatId={activeChatId}
          onForward={(targetId) => msg.sharePoll(forwardPoll.id, targetId)}
          onClose={() => setForwardPoll(null)}
        />
      )}

      {pollCode && authUser && (
        <PollLinkModal code={pollCode} sessionId={authUser.sessionId} onClose={() => setPollCode(null)} />
      )}

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
    </div>
  );
}