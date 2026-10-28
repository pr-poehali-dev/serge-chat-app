import { RefObject, Dispatch, SetStateAction, useState, useEffect, useMemo, useRef } from "react";
import Icon from "@/components/ui/icon";
import { Chat, Message, Attachment, Topic, PinnedMessage, PollData, ScheduledItem } from "./types";
import { RecordedMedia } from "./media/useRecorder";
import ChatHeader from "./chat/ChatHeader";
import MessageList from "./chat/MessageList";
import MessageInput from "./chat/MessageInput";
import SearchBar from "./chat/SearchBar";
import PinnedBar from "./chat/PinnedBar";
import PinnedPoll from "./chat/PinnedPoll";
import SelectionBar from "./chat/SelectionBar";
import { useMentionMembers } from "./chat/useMentionMembers";
import { EmojiCategory, GifCategory, GifItem } from "./chat/EmojiGifPicker";

interface ChatAreaProps {
  activeChat: Chat | undefined;
  onStartCall?: (isVideo: boolean) => void;
  onStartGroupCall?: (isVideo: boolean) => void;
  activeGroupCall?: { callId: number; isVideo: boolean; participants: number } | null;
  onJoinGroupCall?: () => void;
  onOpenBackground?: () => void;
  onOpenReadBy?: (messageId: number) => void;
  showEncryptBadge: boolean;
  setShowEncryptBadge: Dispatch<SetStateAction<boolean>>;
  loadingMsgs: boolean;
  messages: Message[];
  botTyping?: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;

  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  attachMenuOpen: boolean;
  setAttachMenuOpen: Dispatch<SetStateAction<boolean>>;
  attachMenuRef: RefObject<HTMLDivElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;

  emojiPickerOpen: boolean;
  setEmojiPickerOpen: Dispatch<SetStateAction<boolean>>;
  emojiPickerRef: RefObject<HTMLDivElement | null>;
  emojiTab: "emoji" | "stickers" | "gif";
  setEmojiTab: Dispatch<SetStateAction<"emoji" | "stickers" | "gif">>;
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
  onSendSticker?: (path: string) => void;
  sessionId?: string | null;
  onCreatePoll?: () => void;
  onVotePoll?: (pollId: number, optionIds: number[]) => void;
  onClosePoll?: (pollId: number) => void;
  onOpenProfile?: (userId: number) => void;
  onOpenChatInfo?: () => void;
  onAddFiles?: (files: File[]) => void;
  fileNotice?: string;
  onForwardPoll?: (poll: PollData) => void;
  onForwardSelected?: (ids: number[]) => void;
  onDeleteSelected?: (ids: number[]) => Promise<string | null>;
  onDeleteForMe?: (messageId: number) => void;
  scheduledItems?: ScheduledItem[];
  onScheduleMessage?: (whenMs: number) => Promise<string | null>;
  onCancelScheduled?: (id: number) => void;
  onUpdateScheduled?: (id: number, patch: { text?: string; whenMs?: number }) => Promise<string | null>;
  onScheduleSticker?: (path: string, whenMs: number) => Promise<string | null>;
  foundFocus?: { messageId: number; query: string; nonce: number } | null;
}

export default function ChatArea({
  activeChat,
  onStartCall,
  onStartGroupCall,
  activeGroupCall,
  onJoinGroupCall,
  onOpenBackground,
  onOpenReadBy,
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
  onSendSticker,
  sessionId,
  onCreatePoll,
  onVotePoll,
  onClosePoll,
  onOpenProfile,
  onOpenChatInfo,
  onAddFiles,
  fileNotice,
  onForwardPoll,
  onForwardSelected,
  onDeleteSelected,
  onDeleteForMe,
  scheduledItems,
  onScheduleMessage,
  onCancelScheduled,
  onUpdateScheduled,
  onScheduleSticker,
  foundFocus,
}: ChatAreaProps) {
  const mentionMembers = useMentionMembers(activeChat?.id, !!activeChat?.isGroup, sessionId);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const pendingFocusRef = useRef<number | null>(null);
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

  useEffect(() => {
    setSelectMode(false);
    setSelectedIds([]);
  }, [activeChat?.id]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => messages.some((m) => m.id === id && !m.removed)));
  }, [messages]);

  const editLast = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (!m.out || m.removed || m.id >= 1e12 || m.poll) continue;
      const text = m.text || "";
      const plain = !m.kind || m.kind === "text" || m.kind === "image" || m.kind === "file";
      if (!plain || /^(\/stickers\/|\S+\.gif$)/i.test(text.trim())) continue;
      onEdit?.(m);
      return;
    }
  };

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const startSelect = (id: number) => {
    setSelectMode(true);
    setSelectedIds([id]);
  };
  const exitSelect = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  const [localJump, setLocalJump] = useState<{ id: number; nonce: number } | null>(null);

  useEffect(() => {
    if (!foundFocus) return;
    setSelectMode(false);
    if (!foundFocus.query.trim()) {
      pendingFocusRef.current = null;
      setLocalJump({ id: foundFocus.messageId, nonce: foundFocus.nonce });
      return;
    }
    pendingFocusRef.current = foundFocus.messageId;
    setSearchOpen(true);
    setSearchQuery(foundFocus.query);
  }, [foundFocus?.nonce]);

  const effectiveJump =
    localJump && (!jumpRequest || localJump.nonce >= jumpRequest.nonce) ? localJump : jumpRequest;

  useEffect(() => {
    const target = pendingFocusRef.current;
    if (target == null) return;
    const idx = matchIds.indexOf(target);
    if (idx >= 0) {
      setMatchIndex(idx);
      pendingFocusRef.current = null;
    }
  }, [matchIds]);

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
            onOpenBackground={onOpenBackground}
            onOpenChatInfo={onOpenChatInfo}
            topics={topics}
            activeTopicId={activeTopicId}
            onSelectTopic={onSelectTopic}
            onOpenCreateTopic={onOpenCreateTopic}
            onTogglePinTopic={onTogglePinTopic}
            onOpenGroupMembers={onOpenGroupMembers}
            onBack={onBack}
            onToggleSearch={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
            searchOpen={searchOpen}
            onStartSelectMode={
              (onForwardSelected || onDeleteSelected) && messages.some((m) => !m.removed && m.id < 1e12)
                ? () => (selectMode ? exitSelect() : (setSelectMode(true), setSelectedIds([])))
                : undefined
            }
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
            pinned.poll ? (
              <PinnedPoll
                poll={pinned.poll}
                senderName={pinned.senderName}
                onOpen={() => onOpenPinned(pinned)}
                onVote={onVotePoll}
                onUnpin={onPinMessage ? () => onPinMessage(null) : undefined}
              />
            ) : (
              <PinnedBar
                pinned={pinned}
                onOpen={onOpenPinned}
                onUnpin={onPinMessage ? () => onPinMessage(null) : undefined}
              />
            )
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
            jumpRequest={effectiveJump}
            onOpenReadBy={onOpenReadBy}
            onVotePoll={onVotePoll}
            onClosePoll={onClosePoll}
            canModerate={activeChat.myRole === "owner" || activeChat.myRole === "admin"}
            sessionId={sessionId}
            onOpenProfile={onOpenProfile}
            onForwardPoll={onForwardPoll}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onStartSelect={onForwardSelected || onDeleteSelected ? startSelect : undefined}
            onDeleteForMe={onDeleteForMe}
          />

          {selectMode ? (
          <SelectionBar
            count={selectedIds.length}
            ownCount={messages.filter((m) => selectedIds.includes(m.id) && m.out).length}
            onCancel={exitSelect}
            onForward={() => {
              if (selectedIds.length === 0) return;
              onForwardSelected?.(selectedIds);
              exitSelect();
            }}
            onDelete={async () => {
              const err = await (onDeleteSelected ? onDeleteSelected(selectedIds) : Promise.resolve(null));
              if (!err) exitSelect();
              return err;
            }}
          />
          ) : (
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
            onSendSticker={onSendSticker}
            sessionId={sessionId}
            onCreatePoll={onCreatePoll}
            onAddFiles={onAddFiles}
            fileNotice={fileNotice}
            scheduledItems={scheduledItems}
            onScheduleMessage={onScheduleMessage}
            onCancelScheduled={onCancelScheduled}
            onUpdateScheduled={onUpdateScheduled}
            onScheduleSticker={onScheduleSticker}
            onEditLast={onEdit ? editLast : undefined}
            mentionMembers={mentionMembers}
            currentUserId={currentUserId}
          />
          )}
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