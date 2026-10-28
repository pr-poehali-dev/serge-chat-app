import { RefObject, useState, useEffect, useRef } from "react";
import { Chat, Message, PollData } from "../types";
import { resolveBg } from "../background/chatBackgrounds";
import MessageBody from "./messageList/MessageBody";
import MessageMeta from "./messageList/MessageMeta";
import RemoveConfirmModal from "./messageList/RemoveConfirmModal";
import MessageContextMenu from "./MessageContextMenu";
import Icon from "@/components/ui/icon";

interface MessageListProps {
  activeChat: Chat;
  loadingMsgs: boolean;
  messages: Message[];
  botTyping?: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
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
  onForwardPoll?: (poll: PollData) => void;
  selectMode?: boolean;
  selectedIds?: number[];
  onToggleSelect?: (messageId: number) => void;
  onStartSelect?: (messageId: number) => void;
  onDeleteForMe?: (messageId: number) => void;
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
  onForwardPoll,
  selectMode = false,
  selectedIds = [],
  onToggleSelect,
  onStartSelect,
  onDeleteForMe,
}: MessageListProps) {
  const [menu, setMenu] = useState<{ msg: Message; x: number; y: number } | null>(null);
  const [confirmHideId, setConfirmHideId] = useState<number | null>(null);
  const selectedSet = new Set(selectedIds);
  const holdRef = useRef<{ timer: number; x: number; y: number } | null>(null);
  const cancelHold = () => {
    if (holdRef.current) {
      window.clearTimeout(holdRef.current.timer);
      holdRef.current = null;
    }
  };
  const startHold = (msg: Message, e: React.TouchEvent) => {
    if (msg.removed || msg.id >= 1e12 || selectMode) return;
    const t = e.touches[0];
    cancelHold();
    holdRef.current = {
      x: t.clientX,
      y: t.clientY,
      timer: window.setTimeout(() => {
        holdRef.current = null;
        setMenu({ msg, x: t.clientX, y: t.clientY });
      }, 550),
    };
  };
  const moveHold = (e: React.TouchEvent) => {
    const h = holdRef.current;
    if (!h) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - h.x) > 10 || Math.abs(t.clientY - h.y) > 10) cancelHold();
  };
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
              } ${currentMatchId === msg.id ? "bg-amber-400/10 ring-1 ring-amber-400/40" : matchIdSet.has(msg.id) ? "bg-amber-400/[0.04]" : ""} ${
                selectMode && !msg.removed && msg.id < 1e12 ? "cursor-pointer" : ""
              } ${selectMode && selectedSet.has(msg.id) ? "bg-purple-500/15" : ""}`}
              onClick={
                selectMode
                  ? !msg.removed && msg.id < 1e12
                    ? () => onToggleSelect?.(msg.id)
                    : undefined
                  : matchIdSet.has(msg.id) && onSelectMatch
                  ? () => onSelectMatch(msg.id)
                  : undefined
              }
              onTouchStart={(e) => {
                if ((e.target as HTMLElement).closest("a, input, textarea, video, audio, button")) return;
                startHold(msg, e);
              }}
              onTouchMove={moveHold}
              onTouchEnd={cancelHold}
              onTouchCancel={cancelHold}
              onContextMenu={(e) => {
                if (msg.removed || msg.id >= 1e12 || selectMode) {
                  if (selectMode) e.preventDefault();
                  return;
                }
                const target = e.target as HTMLElement;
                if (target.closest("a, input, textarea, video, audio")) return;
                const sel = window.getSelection()?.toString();
                if (sel && sel.length > 0) return;
                e.preventDefault();
                setMenu({ msg, x: e.clientX, y: e.clientY });
              }}
              style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
            >
              {selectMode && (
                <div className="mr-2 flex shrink-0 items-center self-center">
                  {!msg.removed && msg.id < 1e12 ? (
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                        selectedSet.has(msg.id) ? "border-purple-400 bg-purple-500" : "border-fg/30"
                      }`}
                    >
                      {selectedSet.has(msg.id) && <Icon name="Check" size={12} className="text-white" />}
                    </span>
                  ) : (
                    <span className="h-5 w-5" />
                  )}
                </div>
              )}
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
                    onVotePoll={selectMode ? undefined : onVotePoll}
                    onClosePoll={onClosePoll}
                    onForwardPoll={msg.poll && onForwardPoll && !selectMode ? () => onForwardPoll(msg.poll as PollData) : undefined}
                  />

                  <MessageMeta
                    msg={msg}
                    currentUserId={currentUserId}
                    onToggleReaction={onToggleReaction}
                    onOpenReadBy={onOpenReadBy}
                  />
                </div>

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

      {confirmHideId !== null && (
        <RemoveConfirmModal
          forMe
          confirmRemoveId={confirmHideId}
          setConfirmRemoveId={setConfirmHideId}
          onRemove={onDeleteForMe}
        />
      )}

      {menu && (
        <MessageContextMenu
          msg={menu.msg}
          x={menu.x}
          y={menu.y}
          pinned={pinnedMessageId === menu.msg.id}
          onClose={() => setMenu(null)}
          onReply={onReply}
          onEdit={onEdit}
          onForward={onForward}
          onTogglePin={onTogglePin}
          onToggleReaction={onToggleReaction}
          onStartSelect={onStartSelect}
          onAskRemove={onRemove ? (id) => setConfirmRemoveId(id) : undefined}
          onAskDeleteForMe={onDeleteForMe ? (id) => setConfirmHideId(id) : undefined}
        />
      )}
    </>
  );
}