import { RefObject, Dispatch, SetStateAction, useState, useEffect, useMemo } from "react";
import Icon from "@/components/ui/icon";
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
  onStartCall?: (isVideo: boolean) => void;
  onStartGroupCall?: (isVideo: boolean) => void;
  activeGroupCall?: { callId: number; isVideo: boolean; participants: number } | null;
  onJoinGroupCall?: () => void;
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
  emojiTab: "emoji" | "icq" | "gif";
  setEmojiTab: Dispatch<SetStateAction<"emoji" | "icq" | "gif">>;
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
  onSendGif?: (url: string) => void;
  onAddFiles?: (files: File[]) => void;
  fileNotice?: string;
}

export default function ChatArea({
  activeChat,
  onStartCall,
  onStartGroupCall,
  activeGroupCall,
  onJoinGroupCall,
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
  onSendGif,
  onAddFiles,
  fileNotice,
}: ChatAreaProps) {
  const [dragDepth, setDragDepth] = useState(0);
  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types || []).includes("Files");
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
    <main
      className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden"
      onDragEnter={(e) => { if (onAddFiles && hasFiles(e)) { e.preventDefault(); setDragDepth((d) => d + 1); } }}
      onDragOver={(e) => { if (onAddFiles && hasFiles(e)) e.preventDefault(); }}
      onDragLeave={(e) => { if (onAddFiles && hasFiles(e)) setDragDepth((d) => Math.max(0, d - 1)); }}
      onDrop={(e) => {
        if (!onAddFiles || !hasFiles(e)) return;
        e.preventDefault();
        setDragDepth(0);
        onAddFiles(Array.from(e.dataTransfer.files));
      }}
    >
      {dragDepth > 0 && onAddFiles && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-purple-400/60 px-10 py-8">
            <Icon name="Upload" size={32} className="text-purple-400" />
            <p className="text-sm font-medium text-fg/80">Отпустите, чтобы прикрепить файлы</p>
          </div>
        </div>
      )}
      {activeChat ? (
        <>
          <ChatHeader
            activeChat={activeChat}
            showEncryptBadge={showEncryptBadge}
            setShowEncryptBadge={setShowEncryptBadge}
            onStartCall={onStartCall}
            onStartGroupCall={onStartGroupCall}
            activeGroupCall={activeGroupCall}
            onJoinGroupCall={onJoinGroupCall}
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
            onSendGif={onSendGif}
            onAddFiles={onAddFiles}
            fileNotice={fileNotice}
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
