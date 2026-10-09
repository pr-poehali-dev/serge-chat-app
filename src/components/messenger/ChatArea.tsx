import { RefObject, Dispatch, SetStateAction, useState, useEffect, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { CallScreen } from "./CallOverlays";
import { Chat, Message, Attachment, Topic, PinnedMessage } from "./types";
import { RecordedMedia } from "./media/useRecorder";
import ChatHeader from "./chat/ChatHeader";
import MessageList from "./chat/MessageList";
import MessageInput from "./chat/MessageInput";
import SearchBar from "./chat/SearchBar";
import PinnedBar from "./chat/PinnedBar";
import { EmojiCategory, GifCategory, GifItem } from "./chat/EmojiGifPicker";

interface ChatAreaProps {
  activeChat: Chat | undefined;
  call: { isVideo: boolean } | null;
  setCall: Dispatch<SetStateAction<{ isVideo: boolean } | null>>;
  showEncryptBadge: boolean;
  setShowEncryptBadge: Dispatch<SetStateAction<boolean>>;
  loadingMsgs: boolean;
  messages: Message[];
  botTyping?: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;

  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  attachMenuOpen: boolean;
  setAttachMenuOpen: Dispatch<SetStateAction<boolean>>;
  attachMenuRef: RefObject<HTMLDivElement>;
  fileInputRef: RefObject<HTMLInputElement>;
  imageInputRef: RefObject<HTMLInputElement>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;

  emojiPickerOpen: boolean;
  setEmojiPickerOpen: Dispatch<SetStateAction<boolean>>;
  emojiPickerRef: RefObject<HTMLDivElement>;
  emojiTab: "emoji" | "gif";
  setEmojiTab: Dispatch<SetStateAction<"emoji" | "gif">>;
  EMOJI_CATEGORIES: EmojiCategory[];
  GIF_CATEGORIES: GifCategory[];
  gifSearch: string;
  setGifSearch: Dispatch<SetStateAction<string>>;
  filteredGifs: GifItem[] | null;

  inputText: string;
  setInputText: Dispatch<SetStateAction<string>>;
  sendMessage: () => void;
  sending: boolean;

  topics?: Topic[];
  activeTopicId?: number | null;
  onSelectTopic?: (id: number | null) => void;
  onOpenCreateTopic?: () => void;
  onTogglePinTopic?: (topicId: number) => void;
  onOpenGroupMembers?: () => void;
  currentUserId?: number;
  onToggleReaction?: (messageId: number, emoji: string) => void;
  onBack?: () => void;
  onSendMedia?: (kind: "voice" | "circle", media: RecordedMedia) => void;
  onTranscribe?: (messageId: number) => Promise<string | null>;
  replyTo?: Message | null;
  editingMessage?: Message | null;
  sendError?: string;
  onReply?: (msg: Message) => void;
  onEdit?: (msg: Message) => void;
  onRemove?: (messageId: number) => void;
  onCancelContext?: () => void;
  onPinMessage?: (messageId: number | null) => void;
  onOpenPinned?: (pinned: PinnedMessage) => void;
  onForward?: (msg: Message) => void;
  jumpRequest?: { id: number; nonce: number } | null;
}

export default function ChatArea({
  activeChat,
  call,
  setCall,
  showEncryptBadge,
  setShowEncryptBadge,
  loadingMsgs,
  messages,
  botTyping,
  messagesEndRef,
  attachments,
  setAttachments,
  attachMenuOpen,
  setAttachMenuOpen,
  attachMenuRef,
  fileInputRef,
  imageInputRef,
  handleFileSelect,
  emojiPickerOpen,
  setEmojiPickerOpen,
  emojiPickerRef,
  emojiTab,
  setEmojiTab,
  EMOJI_CATEGORIES,
  GIF_CATEGORIES,
  gifSearch,
  setGifSearch,
  filteredGifs,
  inputText,
  setInputText,
  sendMessage,
  sending,
  topics,
  activeTopicId,
  onSelectTopic,
  onOpenCreateTopic,
  onTogglePinTopic,
  onOpenGroupMembers,
  currentUserId,
  onToggleReaction,
  onBack,
  onSendMedia,
  onTranscribe,
  replyTo,
  editingMessage,
  sendError,
  onReply,
  onEdit,
  onRemove,
  onCancelContext,
  onPinMessage,
  onOpenPinned,
  onForward,
  jumpRequest,
}: ChatAreaProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);

  const matchIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!searchOpen || !q) return [];
    return messages
      .filter((m) => !m.removed && (m.text || "").toLowerCase().includes(q))
      .map((m) => m.id);
  }, [messages, searchQuery, searchOpen]);

  useEffect(() => {
    setMatchIndex(matchIds.length > 0 ? matchIds.length - 1 : 0);
  }, [searchQuery, searchOpen, activeChat?.id]);

  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, [activeChat?.id]);

  useEffect(() => {
    if (matchIndex >= matchIds.length && matchIds.length > 0) setMatchIndex(matchIds.length - 1);
  }, [matchIds.length]);

  const goNext = () => {
    if (matchIds.length === 0) return;
    setMatchIndex((i) => (i + 1) % matchIds.length);
  };
  const goPrev = () => {
    if (matchIds.length === 0) return;
    setMatchIndex((i) => (i - 1 + matchIds.length) % matchIds.length);
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const currentMatchId = matchIds.length > 0 ? matchIds[Math.min(matchIndex, matchIds.length - 1)] : null;
  const pinned = activeChat?.pinnedMessage || null;

  return (
    <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* Call overlay */}
      {call && activeChat && (
        <CallScreen
          chat={activeChat}
          isVideo={call.isVideo}
          onEnd={() => setCall(null)}
        />
      )}

      {activeChat ? (
        <>
          <ChatHeader
            activeChat={activeChat}
            showEncryptBadge={showEncryptBadge}
            setShowEncryptBadge={setShowEncryptBadge}
            setCall={setCall}
            topics={topics}
            activeTopicId={activeTopicId}
            onSelectTopic={onSelectTopic}
            onOpenCreateTopic={onOpenCreateTopic}
            onTogglePinTopic={onTogglePinTopic}
            onOpenGroupMembers={onOpenGroupMembers}
            onBack={onBack}
            onToggleSearch={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
            searchOpen={searchOpen}
          />

          {searchOpen && (
            <SearchBar
              query={searchQuery}
              setQuery={setSearchQuery}
              total={matchIds.length}
              current={Math.min(matchIndex, Math.max(matchIds.length - 1, 0))}
              onPrev={goPrev}
              onNext={goNext}
              onClose={closeSearch}
            />
          )}

          {pinned && !searchOpen && onOpenPinned && (
            <PinnedBar
              pinned={pinned}
              onOpen={onOpenPinned}
              onUnpin={onPinMessage ? () => onPinMessage(null) : undefined}
            />
          )}

          <MessageList
            activeChat={activeChat}
            loadingMsgs={loadingMsgs}
            messages={messages}
            botTyping={botTyping}
            messagesEndRef={messagesEndRef}
            currentUserId={currentUserId}
            onToggleReaction={onToggleReaction}
            onTranscribe={onTranscribe}
            onReply={onReply}
            onEdit={onEdit}
            onRemove={onRemove}
            searchQuery={searchOpen ? searchQuery : ""}
            matchIds={matchIds}
            currentMatchId={currentMatchId}
            onSelectMatch={(id) => {
              const idx = matchIds.indexOf(id);
              if (idx >= 0) setMatchIndex(idx);
            }}
            pinnedMessageId={pinned?.id ?? null}
            onTogglePin={
              onPinMessage ? (m) => onPinMessage(pinned?.id === m.id ? null : m.id) : undefined
            }
            onForward={onForward}
            jumpRequest={jumpRequest}
          />

          <MessageInput
            attachments={attachments}
            setAttachments={setAttachments}
            attachMenuOpen={attachMenuOpen}
            setAttachMenuOpen={setAttachMenuOpen}
            attachMenuRef={attachMenuRef}
            fileInputRef={fileInputRef}
            imageInputRef={imageInputRef}
            handleFileSelect={handleFileSelect}
            emojiPickerOpen={emojiPickerOpen}
            setEmojiPickerOpen={setEmojiPickerOpen}
            emojiPickerRef={emojiPickerRef}
            emojiTab={emojiTab}
            setEmojiTab={setEmojiTab}
            EMOJI_CATEGORIES={EMOJI_CATEGORIES}
            GIF_CATEGORIES={GIF_CATEGORIES}
            gifSearch={gifSearch}
            setGifSearch={setGifSearch}
            filteredGifs={filteredGifs}
            inputText={inputText}
            setInputText={setInputText}
            sendMessage={sendMessage}
            sending={sending}
            onSendMedia={onSendMedia}
            replyTo={replyTo}
            editingMessage={editingMessage}
            sendError={sendError}
            onCancelContext={onCancelContext}
            replyAuthorName={activeChat.name}
          />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center animate-fade-in">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl gradient-btn shadow-2xl shadow-purple-500/30">
              <Icon name="MessageCircle" size={36} className="text-white" />
            </div>
            <h2 className="text-xl font-bold gradient-text mb-2">Трынделка</h2>
            <p className="text-sm text-fg/30">Выберите чат для начала общения</p>
          </div>
        </div>
      )}
    </main>
  );
}
