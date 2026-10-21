import { RefObject, useState, useEffect, useRef } from "react";
import { Chat, Message } from "../types";
import { resolveBg } from "../background/chatBackgrounds";
import MessageBody from "./messageList/MessageBody";
import MessageMeta from "./messageList/MessageMeta";
import MessageActions from "./messageList/MessageActions";
import RemoveConfirmModal from "./messageList/RemoveConfirmModal";

interface MessageListProps {
  activeChat: Chat;
  loadingMsgs: boolean;
  messages: Message[];
  botTyping?: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
  currentUserId?: number;
  onToggleReaction?: (messageId: number, emoji: string) => void;
  onTranscribe?: (messageId: number) => Promise<string | null>;
  onReply?: (msg: Message) => void;
  onEdit?: (msg: Message) => void;
  onRemove?: (messageId: number) => void;
  searchQuery?: string;
  matchIds?: number[];
  currentMatchId?: number | null;
  onSelectMatch?: (messageId: number) => void;
  pinnedMessageId?: number | null;
  onTogglePin?: (msg: Message) => void;
  onForward?: (msg: Message) => void;
  jumpRequest?: { id: number; nonce: number } | null;
  onOpenReadBy?: (messageId: number) => void;
  onVotePoll?: (pollId: number, optionIds: number[]) => void;
  onClosePoll?: (pollId: number) => void;
  canModerate?: boolean;
  sessionId?: string | null;
  onOpenProfile?: (userId: number) => void;
}

export default function MessageList({
  activeChat,
  loadingMsgs,
  messages,
  botTyping,
  messagesEndRef,
  currentUserId,
  onToggleReaction,
  onTranscribe,
  onReply,
  onEdit,
  onRemove,
  searchQuery = "",
  matchIds = [],
  currentMatchId = null,
  onSelectMatch,
  pinnedMessageId = null,
  onTogglePin,
  onForward,
  jumpRequest = null,
  onOpenReadBy,
  onVotePoll,
  onClosePoll,
  canModerate = false,
  sessionId = null,
  onOpenProfile,
}: MessageListProps) {
  const [reactionPickerFor, setReactionPickerFor] = useState<number | null>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  const chatBg = resolveBg(activeChat.chatBg);
  const matchIdSet = new Set(matchIds);

  const jumpTo = (messageId: number) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(messageId);
    window.setTimeout(() => setHighlightId(null), 1500);
  };

  useEffect(() => {
    if (currentMatchId == null) return;
    const el = document.getElementById(`msg-${currentMatchId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentMatchId]);

  useEffect(() => {
    if (!jumpRequest) return;
    jumpTo(jumpRequest.id);
  }, [jumpRequest]);

  useEffect(() => {
    if (reactionPickerFor === null) return;
    const handler = (e: MouseEvent) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target as Node)) {
        setReactionPickerFor(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [reactionPickerFor]);

  return (
    <>
      {/* Messages */}
      <div
        className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-6 py-4 sm:py-5 space-y-3"
        style={chatBg ? ({ ...chatBg.style, ...chatBg.vars } as React.CSSProperties) : undefined}
        data-chat-bg={activeChat.chatBg ? "custom" : undefined}
      >
        {loadingMsgs ? (
          <div className="flex items-center justify-center h-full">
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
        ) : (
          messages.map((msg, i) => {
            return (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              className={`group/msg flex rounded-2xl transition-colors duration-500 ${msg.out ? "justify-end" : "justify-start"} animate-fade-in ${
                highlightId === msg.id ? "bg-purple-500/15" : ""
              } ${currentMatchId === msg.id ? "bg-amber-400/10 ring-1 ring-amber-400/40" : matchIdSet.has(msg.id) ? "bg-amber-400/[0.04]" : ""}`}
              onClick={matchIdSet.has(msg.id) && onSelectMatch ? () => onSelectMatch(msg.id) : undefined}
              style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
            >
              {!msg.out && (() => {
                const avatar =
                  msg.senderAvatarUrl && activeChat.isGroup ? (
                    <img
                      src={msg.senderAvatarUrl}
                      alt={msg.senderName || ""}
                      className="h-7 w-7 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${(activeChat.isGroup && msg.senderColor) || activeChat.color}cc, ${(activeChat.isGroup && msg.senderColor) || activeChat.color}55)` }}
                    >
                      {activeChat.isGroup ? (msg.senderInitials || msg.senderName || "?")[0] : activeChat.avatar[0]}
                    </div>
                  );
                return activeChat.isGroup && onOpenProfile && msg.sender_id > 0 && msg.id < 1e12 ? (
                  <button
                    type="button"
                    onClick={() => onOpenProfile(msg.sender_id)}
                    title={msg.senderName ? `Профиль: ${msg.senderName}` : "Профиль"}
                    aria-label={msg.senderName ? `Профиль: ${msg.senderName}` : "Профиль"}
                    className="mr-2 mb-1 self-end rounded-xl transition-transform hover:scale-105"
                  >
                    {avatar}
                  </button>
                ) : (
                  <div className="mr-2 mb-1 self-end">{avatar}</div>
                );
              })()}
              <div className={`max-w-[82%] sm:max-w-[70%] lg:max-w-[62%] flex items-end gap-1 ${msg.out ? "flex-row-reverse" : ""}`}>
                <div className="min-w-0">
                  {activeChat.isGroup && !msg.out && msg.senderName && (
                    <p className="mb-0.5 px-1 text-[11px] font-medium truncate" style={{ color: msg.senderColor || "#a855f7" }}>
                      {msg.senderName}
                    </p>
                  )}
                  <MessageBody
                    msg={msg}
                    searchQuery={searchQuery}
                    currentMatchId={currentMatchId}
                    jumpTo={jumpTo}
                    onTranscribe={onTranscribe}
                    canModerate={canModerate}
                    sessionId={sessionId}
                    onVotePoll={onVotePoll}
                    onClosePoll={onClosePoll}
                  />

                  <MessageMeta
                    msg={msg}
                    currentUserId={currentUserId}
                    onToggleReaction={onToggleReaction}
                    onOpenReadBy={onOpenReadBy}
                  />
                </div>

                <MessageActions
                  msg={msg}
                  pinnedMessageId={pinnedMessageId}
                  onToggleReaction={onToggleReaction}
                  onReply={onReply}
                  onEdit={onEdit}
                  onRemove={onRemove}
                  onTogglePin={onTogglePin}
                  onForward={onForward}
                  setConfirmRemoveId={setConfirmRemoveId}
                  reactionPickerFor={reactionPickerFor}
                  setReactionPickerFor={setReactionPickerFor}
                  reactionPickerRef={reactionPickerRef}
                />
              </div>
            </div>
          );})
        )}
        {botTyping && (
          <div className="flex justify-start animate-fade-in">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white mr-2 self-end mb-1"
              style={{ background: `linear-gradient(135deg, ${activeChat.color}cc, ${activeChat.color}55)` }}
            >
              {activeChat.avatar[0]}
            </div>
            <div className="msg-bubble-in px-4 py-3 flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-fg/40 animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {confirmRemoveId !== null && (
        <RemoveConfirmModal
          confirmRemoveId={confirmRemoveId}
          setConfirmRemoveId={setConfirmRemoveId}
          onRemove={onRemove}
        />
      )}
    </>
  );
}
