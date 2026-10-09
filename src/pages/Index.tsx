import { useState, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppHeight } from "@/hooks/use-app-height";
import { IncomingCall } from "@/components/messenger/CallOverlays";
import Sidebar from "@/components/messenger/Sidebar";
import ChatArea from "@/components/messenger/ChatArea";
import BotStore from "@/components/messenger/BotStore";
import CreateGroupModal from "@/components/messenger/CreateGroupModal";
import CreateTopicModal from "@/components/messenger/CreateTopicModal";
import AuthScreen from "@/components/messenger/AuthScreen";
import GroupMembersModal from "@/components/messenger/GroupMembersModal";
import { Chat, Message, Tab } from "@/components/messenger/types";
import { EMOJI_CATEGORIES, GIF_CATEGORIES, API_CHATS } from "./index/config";
import { useAuth } from "./index/useAuth";
import { useComposer } from "./index/useComposer";
import { useBotsAndGroups } from "./index/useBotsAndGroups";
import { useMessaging } from "./index/useMessaging";

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

  const [call, setCall] = useState<{ isVideo: boolean } | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    caller: { name: string; avatar: string; color: string };
    isVideo: boolean;
  } | null>(null);

  const {
    authUser,
    authLoading,
    handleAuthenticated,
    handleLogout,
    handleUpdateProfile,
    handleAvatarUpdated,
    authHeaders,
  } = useAuth({ setChats, setActiveChatId });

  const composer = useComposer();

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
  });

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
        />
      )}

      {(!isMobile || mobileShowChat) && (
      <ChatArea
        activeChat={activeChat}
        call={call}
        setCall={setCall}
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
        jumpRequest={msg.jumpRequest}
      />
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
        />
      )}

      {/* Incoming call overlay */}
      {incomingCall && (
        <IncomingCall
          caller={incomingCall.caller}
          isVideo={incomingCall.isVideo}
          onAccept={() => {
            setIncomingCall(null);
            setCall({ isVideo: incomingCall.isVideo });
          }}
          onDecline={() => setIncomingCall(null)}
        />
      )}
    </div>
  );
}