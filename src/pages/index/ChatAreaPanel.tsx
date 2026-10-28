import { Dispatch, SetStateAction } from "react";
import ChatArea from "@/components/messenger/ChatArea";
import { AuthUser, Chat, Message, PollData } from "@/components/messenger/types";
import { EMOJI_CATEGORIES, GIF_CATEGORIES } from "./config";
import { useComposer } from "./useComposer";
import { useBotsAndGroups } from "./useBotsAndGroups";
import { useMessaging } from "./useMessaging";
import { useCall } from "./useCall";
import { useGroupCall } from "./useGroupCall";
import { useScheduled } from "./useScheduled";

interface ChatAreaPanelProps {
  activeChat: Chat | undefined;
  activeChatId: number | null;
  authUser: AuthUser | null;
  isBotChat: boolean;
  isMobile: boolean;
  displayMessages: Message[];
  realChatId: number | null;
  showEncryptBadge: boolean;
  setShowEncryptBadge: Dispatch<SetStateAction<boolean>>;
  handleMobileBackToChats: () => void;
  composer: ReturnType<typeof useComposer>;
  bg: ReturnType<typeof useBotsAndGroups>;
  msg: ReturnType<typeof useMessaging>;
  callCtl: ReturnType<typeof useCall>;
  groupCtl: ReturnType<typeof useGroupCall>;
  scheduled: ReturnType<typeof useScheduled>;
  scheduleFromInput: (whenMs: number) => Promise<string | null>;
  scheduleSticker: (path: string, whenMs: number) => Promise<string | null>;
  foundFocus: { messageId: number; query: string; nonce: number } | null;
  setPollOpen: Dispatch<SetStateAction<boolean>>;
  setProfileUserId: Dispatch<SetStateAction<number | null>>;
  setGroupInfoOpen: Dispatch<SetStateAction<boolean>>;
  setBgPickerOpen: Dispatch<SetStateAction<boolean>>;
  setReadByMessageId: Dispatch<SetStateAction<number | null>>;
  setForwardSource: Dispatch<SetStateAction<Message | null>>;
  setForwardMany: Dispatch<SetStateAction<number[] | null>>;
  setForwardPoll: Dispatch<SetStateAction<PollData | null>>;
}

export default function ChatAreaPanel({
  activeChat,
  activeChatId,
  authUser,
  isBotChat,
  isMobile,
  displayMessages,
  realChatId,
  showEncryptBadge,
  setShowEncryptBadge,
  handleMobileBackToChats,
  composer,
  bg,
  msg,
  callCtl,
  groupCtl,
  scheduled,
  scheduleFromInput,
  scheduleSticker,
  foundFocus,
  setPollOpen,
  setProfileUserId,
  setGroupInfoOpen,
  setBgPickerOpen,
  setReadByMessageId,
  setForwardSource,
  setForwardMany,
  setForwardPoll,
}: ChatAreaPanelProps) {
  return (
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
      onUpdateScheduled={realChatId ? scheduled.update : undefined}
      onScheduleSticker={realChatId ? scheduleSticker : undefined}
      foundFocus={foundFocus}
    />
  );
}
