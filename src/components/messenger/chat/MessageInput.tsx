import { RefObject, Dispatch, SetStateAction, useState } from "react";
import Icon from "@/components/ui/icon";
import { Attachment, Message } from "../types";
import MediaRecorderControls from "../media/MediaRecorderControls";
import { RecordedMedia } from "../media/useRecorder";
import EmojiGifPicker, { EmojiCategory, GifCategory, GifItem } from "./EmojiGifPicker";
import { replyLabel } from "./ReplyQuote";

interface MessageInputProps {
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
  onSendMedia?: (kind: "voice" | "circle", media: RecordedMedia) => void;
  replyTo?: Message | null;
  editingMessage?: Message | null;
  sendError?: string;
  onCancelContext?: () => void;
  replyAuthorName?: string;
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
}: MessageInputProps) {
  const [recordingActive, setRecordingActive] = useState(false);
  const hasDraft = inputText.trim().length > 0 || attachments.length > 0 || !!editingMessage;

  return (
    <>
      {/* Input */}
      <div className="glass-strong safe-bottom border-t border-white/[0.06] px-2 sm:px-4 py-2.5 sm:py-3">
        {sendError && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 animate-fade-in">
            <Icon name="TriangleAlert" size={13} className="shrink-0 text-red-400" />
            <p className="text-xs text-red-300">{sendError}</p>
          </div>
        )}

        {(replyTo || editingMessage) && (
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/[0.05] border-l-2 border-purple-400 px-3 py-2 animate-fade-in">
            <Icon name={editingMessage ? "Pencil" : "CornerUpLeft"} size={14} className="shrink-0 text-purple-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-purple-300 truncate">
                {editingMessage ? "Редактирование сообщения" : `Ответ: ${replyTo?.out ? "Вам" : replyTo?.senderName || replyAuthorName || "собеседнику"}`}
              </p>
              <p className="text-xs text-white/50 truncate">
                {replyLabel({
                  text: (editingMessage || replyTo)?.text || "",
                  kind: ((editingMessage || replyTo)?.kind || "text") as "text",
                })}
              </p>
            </div>
            <button
              onClick={onCancelContext}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-all"
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
                  <p className="text-xs font-medium text-white/80 truncate">{att.name}</p>
                  <p className="text-[10px]" style={{ color: att.color }}>{att.size}</p>
                </div>
                <button onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  className="ml-1 text-white/25 hover:text-white/60 transition-colors">
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
                  : "text-white/30 hover:text-purple-400 hover:bg-purple-400/[0.08]"
              }`}
            >
              <Icon name={attachMenuOpen ? "X" : "Paperclip"} size={18} />
            </button>

            {/* Attach menu */}
            {attachMenuOpen && (
              <div ref={attachMenuRef} className="absolute bottom-14 left-0 rounded-2xl overflow-hidden animate-fade-in z-20"
                style={{ background: "rgba(18,10,35,0.95)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)", minWidth: "200px" }}>
                {[
                  { label: "Фото и видео", icon: "Image", color: "#a855f7", ref: imageInputRef, accept: "image/*,video/*" },
                  { label: "Файл", icon: "File", color: "#38bdf8", ref: fileInputRef, accept: "*" },
                  { label: "Документ", icon: "FileText", color: "#34d399", ref: null, accept: ".pdf,.doc,.docx,.xls,.xlsx" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (item.ref) {
                        item.ref.current?.click();
                      } else {
                        fileInputRef.current!.accept = item.accept;
                        fileInputRef.current?.click();
                      }
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 hover:bg-white/[0.06] transition-all text-left"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl"
                      style={{ background: `${item.color}22` }}>
                      <Icon name={item.icon} size={16} style={{ color: item.color }} />
                    </div>
                    <span className="text-sm text-white/75">{item.label}</span>
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
          />

          {/* Hidden file inputs */}
          <input ref={fileInputRef} type="file" multiple className="hidden" accept="*" onChange={handleFileSelect} />
          <input ref={imageInputRef} type="file" multiple className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />

          <div className={`${recordingActive ? "hidden" : "flex"} flex-1 items-end gap-3 rounded-2xl bg-white/[0.05] border border-white/[0.07] px-4 py-3 focus-within:border-purple-500/40 transition-all`}>
            <textarea
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none"
              placeholder={editingMessage ? "Измените сообщение..." : attachments.length > 0 ? "Добавить подпись..." : "Сообщение..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
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

          {(hasDraft || !onSendMedia) && (
            <button
              onClick={sendMessage}
              disabled={(!inputText.trim() && attachments.length === 0) || sending}
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
