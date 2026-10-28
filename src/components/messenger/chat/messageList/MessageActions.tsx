import { Dispatch, RefObject, SetStateAction } from "react";
import Icon from "@/components/ui/icon";
import { Message } from "../../types";
import { extractGifUrl } from "@/pages/index/config";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

interface MessageActionsProps {
  msg: Message;
  pinnedMessageId: number | null;
  onToggleReaction?: (messageId: number, emoji: string) => void;
  onReply?: (msg: Message) => void;
  onEdit?: (msg: Message) => void;
  onRemove?: (messageId: number) => void;
  onTogglePin?: (msg: Message) => void;
  onForward?: (msg: Message) => void;
  setConfirmRemoveId: Dispatch<SetStateAction<number | null>>;
  reactionPickerFor: number | null;
  setReactionPickerFor: Dispatch<SetStateAction<number | null>>;
  reactionPickerRef: RefObject<HTMLDivElement | null>;
}

export default function MessageActions({
  msg,
  pinnedMessageId,
  onToggleReaction,
  onReply,
  onEdit,
  onRemove,
  onTogglePin,
  onForward,
  setConfirmRemoveId,
  reactionPickerFor,
  setReactionPickerFor,
  reactionPickerRef,
}: MessageActionsProps) {
  return (
    <>
      {!msg.removed && (onToggleReaction || onReply || onTogglePin || onForward || (msg.out && (onEdit || onRemove))) && (
        <div className="relative shrink-0 self-start flex items-center opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 max-[639px]:opacity-60 transition-opacity">
          {onReply && (
            <button
              onClick={() => onReply(msg)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-fg/30 hover:text-purple-400 hover:bg-fg/[0.08] transition-all"
              title="Ответить"
            >
              <Icon name="Reply" size={13} />
            </button>
          )}
          {msg.out && onEdit && (msg.kind === "text" || msg.kind === "image" || msg.kind === "file" || !msg.kind) && extractGifUrl(msg.text) === null && msg.id < 1e12 && (
            <button
              onClick={() => onEdit(msg)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-fg/30 hover:text-purple-400 hover:bg-fg/[0.08] transition-all"
              title="Изменить"
            >
              <Icon name="Pencil" size={12} />
            </button>
          )}
          {msg.out && onRemove && msg.id < 1e12 && (
            <button
              onClick={() => setConfirmRemoveId(msg.id)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-fg/30 hover:text-red-400 hover:bg-fg/[0.08] transition-all"
              title="Удалить"
            >
              <Icon name="Trash2" size={12} />
            </button>
          )}
          {onForward && msg.id < 1e12 && (
            <button
              onClick={() => onForward(msg)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-fg/30 hover:text-purple-400 hover:bg-fg/[0.08] transition-all"
              title="Переслать"
            >
              <Icon name="Forward" size={13} />
            </button>
          )}
          {onTogglePin && msg.id < 1e12 && (
            <button
              onClick={() => onTogglePin(msg)}
              className={`flex h-6 w-6 items-center justify-center rounded-full hover:bg-fg/[0.08] transition-all ${
                pinnedMessageId === msg.id ? "text-amber-400" : "text-fg/30 hover:text-amber-400"
              }`}
              title={pinnedMessageId === msg.id ? "Открепить сообщение" : "Закрепить сообщение"}
            >
              <Icon name="Pin" size={12} className={pinnedMessageId === msg.id ? "fill-amber-400" : ""} />
            </button>
          )}
          {onToggleReaction && (
            <button
              onClick={() => setReactionPickerFor((v) => (v === msg.id ? null : msg.id))}
              className="flex h-6 w-6 items-center justify-center rounded-full text-fg/30 hover:text-purple-400 hover:bg-fg/[0.08] transition-all"
              title="Добавить реакцию"
            >
              <Icon name="SmilePlus" size={13} />
            </button>
          )}
          {onToggleReaction && reactionPickerFor === msg.id && (
            <div
              ref={reactionPickerRef}
              className={`absolute z-20 top-7 flex items-center gap-0.5 rounded-2xl px-1.5 py-1 animate-fade-in ${
                msg.out ? "right-0" : "left-0"
              }`}
              style={{ background: "hsl(var(--popover) / 0.98)", border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))", backdropFilter: "blur(20px)" }}
            >
              {QUICK_REACTIONS.map((em) => (
                <button
                  key={em}
                  onClick={() => {
                    onToggleReaction(msg.id, em);
                    setReactionPickerFor(null);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-lg hover:bg-fg/[0.08] hover:scale-110 transition-all"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}