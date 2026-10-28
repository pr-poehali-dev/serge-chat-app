import { useState, useRef, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppHeight } from "@/hooks/use-app-height";
import Sidebar from "@/components/messenger/Sidebar";
import AuthScreen from "@/components/messenger/AuthScreen";
import { Chat, Message, Tab, PollData, FoundMessage } from "@/components/messenger/types";
import { API_CHATS } from "./index/config";
import { useAuth } from "./index/useAuth";
import { useComposer } from "./index/useComposer";
import { useBotsAndGroups } from "./index/useBotsAndGroups";
import { useMessaging } from "./index/useMessaging";
import { useCall } from "./index/useCall";
import { useGroupCall } from "./index/useGroupCall";
import { useScheduled } from "./index/useScheduled";
import { useDraft } from "./index/useDraft";
import IndexLoading from "./index/IndexLoading";
import ChatAreaPanel from "./index/ChatAreaPanel";
import ForwardModals from "./index/ForwardModals";
import IndexOverlays from "./index/IndexOverlays";

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
    const caption = composer.inputText.trim();
    const files = composer.attachments;
    if (files.length === 0) {
      const err = await scheduled.schedule({ kind: "text", text: caption }, whenMs);
      if (!err) composer.setInputText("");
      return err;
    }
    for (let i = 0; i < files.length; i++) {
      const att = files[i];
      if (!att.file) return "Не удалось прочитать файл";
      const err = await scheduled.schedule(
        { kind: att.type.startsWith("image/") ? "image" : "file", text: i === 0 ? caption : "", file: att.file },
        whenMs + i
      );
      if (err) {
        composer.setAttachments(files.slice(i));
        if (i > 0) composer.setInputText("");
        return err;
      }
    }
    composer.setAttachments([]);
    composer.setInputText("");
    return null;
  };
  const scheduleSticker = (path: string, whenMs: number) => scheduled.schedule({ kind: "text", text: path }, whenMs);

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
    return <IndexLoading />;
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
          folders={msg.folders}
          onCreateFolder={msg.createFolder}
          onRenameFolder={msg.renameFolder}
          onDeleteFolder={msg.deleteFolder}
          onMoveChatToFolder={(chatId, folderId) => { msg.moveChatToFolder(chatId, folderId); }}
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
        <ChatAreaPanel
          activeChat={activeChat}
          activeChatId={activeChatId}
          authUser={authUser}
          isBotChat={isBotChat}
          isMobile={isMobile}
          displayMessages={displayMessages}
          realChatId={realChatId}
          showEncryptBadge={showEncryptBadge}
          setShowEncryptBadge={setShowEncryptBadge}
          handleMobileBackToChats={handleMobileBackToChats}
          composer={composer}
          bg={bg}
          msg={msg}
          callCtl={callCtl}
          groupCtl={groupCtl}
          scheduled={scheduled}
          scheduleFromInput={scheduleFromInput}
          scheduleSticker={scheduleSticker}
          foundFocus={foundFocus}
          setPollOpen={setPollOpen}
          setProfileUserId={setProfileUserId}
          setGroupInfoOpen={setGroupInfoOpen}
          setBgPickerOpen={setBgPickerOpen}
          setReadByMessageId={setReadByMessageId}
          setForwardSource={setForwardSource}
          setForwardMany={setForwardMany}
          setForwardPoll={setForwardPoll}
        />
      )}

      <ForwardModals
        chats={chats}
        activeChatId={activeChatId}
        authUser={authUser}
        msg={msg}
        forwardSource={forwardSource}
        setForwardSource={setForwardSource}
        forwardMany={forwardMany}
        setForwardMany={setForwardMany}
        forwardPoll={forwardPoll}
        setForwardPoll={setForwardPoll}
        pollCode={pollCode}
        setPollCode={setPollCode}
      />

      <IndexOverlays
        chats={chats}
        setChats={setChats}
        activeChat={activeChat}
        setActiveChatId={setActiveChatId}
        setActiveTab={setActiveTab}
        authUser={authUser}
        reloadChats={reloadChats}
        bg={bg}
        msg={msg}
        callCtl={callCtl}
        groupCtl={groupCtl}
        pollOpen={pollOpen}
        setPollOpen={setPollOpen}
        profileUserId={profileUserId}
        setProfileUserId={setProfileUserId}
        groupInfoOpen={groupInfoOpen}
        setGroupInfoOpen={setGroupInfoOpen}
        readByMessageId={readByMessageId}
        setReadByMessageId={setReadByMessageId}
        bgPickerOpen={bgPickerOpen}
        setBgPickerOpen={setBgPickerOpen}
      />
    </div>
  );
}
