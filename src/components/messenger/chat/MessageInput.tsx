import { RefObject, Dispatch, SetStateAction, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Attachment, Message, ScheduledItem } from "../types";
import MediaRecorderControls from "../media/MediaRecorderControls";
import { RecordedMedia } from "../media/useRecorder";
import EmojiGifPicker, { EmojiCategory, GifCategory, GifItem } from "./EmojiGifPicker";
import { replyLabel } from "./ReplyQuote";
import ScheduledList from "./ScheduledList";
import SchedulePopover from "./SchedulePopover";
import MentionSuggest from "./MentionSuggest";
import { GroupMember } from "../groupMembers/types";

interface MessageInputProps {
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
  onSendMedia?: (kind: "voice" | "circle", media: RecordedMedia) => void;
  replyTo?: Message | null;
  editingMessage?: Message | null;
  sendError?: string;
  onCancelContext?: () => void;
  replyAuthorName?: string;
  onSendGif?: (url: string) => void;
  onSendSticker?: (path: string) => void;
  sessionId?: string | null;
  onCreatePoll?: () => void;
  onAddFiles?: (files: File[]) => void;
  fileNotice?: string;
  scheduledItems?: ScheduledItem[];
  onScheduleMessage?: (whenMs: number) => Promise<string | null>;
  onCancelScheduled?: (id: number) => void;
  onUpdateScheduled?: (id: number, patch: { text?: string; whenMs?: number }) => Promise<string | null>;
  onScheduleSticker?: (path: string, whenMs: number) => Promise<string | null>;
  onEditLast?: () => void;
  mentionMembers?: GroupMember[];
  currentUserId?: number;
}

export default function MessageInput({
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
  onSendMedia,
  replyTo,
  editingMessage,
  sendError,
  onCancelContext,
  replyAuthorName,
  onSendGif,
  onSendSticker,
  sessionId,
  onCreatePoll,
  onAddFiles,
  fileNotice,
  scheduledItems = [],
  onScheduleMessage,
  onCancelScheduled,
  onUpdateScheduled,
  onScheduleSticker,
  onEditLast,
  mentionMembers = [],
  currentUserId,
}: MessageInputProps) {
  const [recordingActive, setRecordingActive] = useState(false);
  const hasDraft = inputText.trim().length > 0 || attachments.length > 0 || !!editingMessage;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionClosedAt, setMentionClosedAt] = useState<number | null>(null);

  const mentionMatch = mentionMembers.length > 0 ? /(?:^|\s)@([\p{L}\p{N}_.-]*)$/u.exec(inputText.slice(0, caret)) : null;
  const mentionStart = mentionMatch ? caret - mentionMatch[1].length - 1 : -1;
  const mentionQuery = (mentionMatch?.[1] || "").toLowerCase();
  const mentionOptions =
    mentionMatch && mentionClosedAt !== mentionStart
      ? mentionMembers
          .filter((m) => m.id !== currentUserId)
          .filter((m) => !mentionQuery || (m.login || "").toLowerCase().includes(mentionQuery) || m.displayName.toLowerCase().includes(mentionQuery))
          .slice(0, 6)
      : [];
  const activeMention = Math.min(mentionIndex, Math.max(mentionOptions.length - 1, 0));

  const pickMention = (member: GroupMember) => {
    const handle = member.login || member.displayName.replace(/\s+/g, "_");
    const before = inputText.slice(0, mentionStart);
    const after = inputText.slice(caret);
    const next = `${before}@${handle} ${after.replace(/^\s/, "")}`;
    const pos = before.length + handle.length + 2;
    setInputText(next);
    setMentionIndex(0);
    window.requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(pos, pos);
      setCaret(pos);
    });
  };

  return (
    <>
      {/* Input */}
      <div className="glass-strong safe-bottom border-t border-fg/[0.06] px-2 sm:px-4 py-2.5 sm:py-3">
        {fileNotice && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 animate-fade-in">
            <Icon name="TriangleAlert" size={13} className="shrink-0 text-amber-400" />
            <p className="text-xs text-amber-300">{fileNotice}</p>
          </div>
        )}
        {sendError && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 animate-fade-in">
            <Icon name="TriangleAlert" size={13} className="shrink-0 text-red-400" />
            <p className="text-xs text-red-300">{sendError}</p>
          </div>
        )}

        {onCancelScheduled && onUpdateScheduled && (
          <ScheduledList items={scheduledItems} onCancel={onCancelScheduled} onUpdate={onUpdateScheduled} />
        )}

        {(replyTo || editingMessage) && (
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-fg/[0.05] border-l-2 border-purple-400 px-3 py-2 animate-fade-in">
            <Icon name={editingMessage ? "Pencil" : "CornerUpLeft"} size={14} className="shrink-0 text-purple-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-purple-300 truncate">
                {editingMessage ? "Редактирование сообщения" : `Ответ: ${replyTo?.out ? "Вам" : replyTo?.senderName || replyAuthorName || "собеседнику"}`}
              </p>
              <p className="text-xs text-fg/50 truncate">
                {replyLabel({
                  text: (editingMessage || replyTo)?.text || "",
                  kind: ((editingMessage || replyTo)?.kind || "text") as "text",
                })}
              </p>
            </div>
            <button
              onClick={onCancelContext}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-fg/40 hover:text-fg/80 hover:bg-fg/[0.08] transition-all"
            >
              <Icon name="X" size={14} />
            </button>
          </div>
        )}

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2 animate-fade-in"
                style={{ background: `${att.color}18`, border: `1px solid ${att.color}33` }}>
                <Icon name={att.icon} size={14} style={{ color: att.color }} />
                <div className="max-w-[120px]">
                  <p className="text-xs font-medium text-fg/80 truncate">{att.name}</p>
                  <p className="text-[10px]" style={{ color: att.color }}>{att.size}</p>
                </div>
                <button onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  className="ml-1 text-fg/25 hover:text-fg/60 transition-colors">
                  <Icon name="X" size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-3">
          {/* Attach button with popup */}
          <div className="relative">
            <button
              onClick={() => setAttachMenuOpen((v) => !v)}
              className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
                attachMenuOpen
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "text-fg/30 hover:text-purple-400 hover:bg-purple-400/[0.08]"
              }`}
            >
              <Icon name={attachMenuOpen ? "X" : "Paperclip"} size={18} />
            </button>

            {/* Attach menu */}
            {attachMenuOpen && (
              <div ref={attachMenuRef} className="absolute bottom-14 left-0 rounded-2xl overflow-hidden animate-fade-in z-20"
                style={{ background: "hsl(var(--popover) / 0.95)", border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))", backdropFilter: "blur(20px)", minWidth: "200px" }}>
                {[
                  { label: "Фото и видео", icon: "Image", color: "#a855f7", ref: imageInputRef, accept: "image/*,video/*" },
                  { label: "Файл", icon: "File", color: "#38bdf8", ref: fileInputRef, accept: "*" },
                  { label: "Документ", icon: "FileText", color: "#34d399", ref: null, accept: ".pdf,.doc,.docx,.xls,.xlsx" },
                  ...(onCreatePoll ? [{ label: "Опрос", icon: "BarChart3", color: "#f59e0b", ref: null, accept: "", poll: true }] : []),
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      if ("poll" in item && item.poll) {
                        setAttachMenuOpen(false);
                        onCreatePoll?.();
                        return;
                      }
                      if (item.ref) {
                        item.ref.current?.click();
                      } else {
                        fileInputRef.current!.accept = item.accept;
                        fileInputRef.current?.click();
                      }
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 hover:bg-fg/[0.06] transition-all text-left"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl"
                      style={{ background: `${item.color}22` }}>
                      <Icon name={item.icon} size={16} style={{ color: item.color }} />
                    </div>
                    <span className="text-sm text-fg/75">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <EmojiGifPicker
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
            setInputText={setInputText}
            onPickGif={onSendGif}
            onPickSticker={onSendSticker}
            onScheduleSticker={onScheduleSticker}
            sessionId={sessionId}
          />

          {/* Hidden file inputs */}
          <input ref={fileInputRef} type="file" multiple className="hidden" accept="*" onChange={handleFileSelect} />
          <input ref={imageInputRef} type="file" multiple className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />

          <div className={`${recordingActive ? "hidden" : "flex"} relative flex-1 items-end gap-3 rounded-2xl bg-fg/[0.05] border border-fg/[0.07] px-4 py-3 focus-within:border-purple-500/40 transition-all`}>
            <MentionSuggest members={mentionOptions} activeIndex={activeMention} onPick={pickMention} onHover={setMentionIndex} />
            <textarea
              ref={textareaRef}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-fg/85 placeholder:text-fg/25 outline-none"
              placeholder={editingMessage ? "Измените сообщение..." : attachments.length > 0 ? "Добавить подпись..." : "Сообщение..."}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setCaret(e.target.selectionStart ?? e.target.value.length);
                setMentionIndex(0);
                setMentionClosedAt(null);
              }}
              onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
              onPaste={(e) => {
                if (!onAddFiles) return;
                const files = Array.from(e.clipboardData?.files || []);
                if (files.length === 0) return;
                e.preventDefault();
                onAddFiles(files);
              }}
              onKeyDown={(e) => {
                if (mentionOptions.length > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setMentionIndex((activeMention + 1) % mentionOptions.length);
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setMentionIndex((activeMention - 1 + mentionOptions.length) % mentionOptions.length);
                    return;
                  }
                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    pickMention(mentionOptions[activeMention]);
                    return;
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setMentionClosedAt(mentionStart);
                    return;
                  }
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                  return;
                }
                if (e.key === "ArrowUp" && !inputText && !editingMessage && attachments.length === 0 && onEditLast) {
                  e.preventDefault();
                  onEditLast();
                }
              }}
              style={{ maxHeight: "120px" }}
            />
            <Icon name="Lock" size={12} className="text-emerald-400/40 shrink-0 mb-0.5" />
          </div>

          {!hasDraft && onSendMedia && (
            <MediaRecorderControls
              disabled={sending}
              onRecorded={onSendMedia}
              onRecordingChange={setRecordingActive}
            />
          )}

          {onScheduleMessage && (inputText.trim().length > 0 || attachments.length > 0) && !editingMessage && !recordingActive && (
            <SchedulePopover onSchedule={onScheduleMessage} />
          )}

          {!recordingActive && (
            <button
              onClick={sendMessage}
              disabled={(!inputText.trim() && attachments.length === 0) || sending}
              title={editingMessage ? "Сохранить" : "Отправить"}
              aria-label={editingMessage ? "Сохранить" : "Отправить"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl gradient-btn text-white shadow-lg shadow-purple-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:-translate-y-0.5"
            >
              <Icon name={sending ? "Loader" : editingMessage ? "Check" : "Send"} size={16} className={sending ? "animate-spin" : ""} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}