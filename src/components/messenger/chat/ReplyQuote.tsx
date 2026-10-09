import Icon from "@/components/ui/icon";
import { ReplyPreview } from "../types";

const KIND_LABEL: Record<ReplyPreview["kind"], string> = {
  text: "",
  voice: "Голосовое сообщение",
  circle: "Видеосообщение",
  image: "Фото",
  file: "Файл",
};

export function replyLabel(reply: { text: string; kind: ReplyPreview["kind"]; removed?: boolean }): string {
  if (reply.removed) return "Сообщение удалено";
  return reply.text || KIND_LABEL[reply.kind] || "Сообщение";
}

interface ReplyQuoteProps {
  reply: ReplyPreview;
  out: boolean;
  onJump?: (messageId: number) => void;
}

export default function ReplyQuote({ reply, out, onJump }: ReplyQuoteProps) {
  return (
    <button
      type="button"
      onClick={() => onJump?.(reply.id)}
      className={`mb-1.5 flex w-full min-w-[120px] items-start gap-2 rounded-lg border-l-2 px-2 py-1 text-left ${
        out ? "border-white/70 bg-black/20" : "border-purple-400 bg-white/[0.06]"
      }`}
    >
      <Icon name="CornerUpLeft" size={11} className="mt-0.5 shrink-0 opacity-60" />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[11px] font-semibold ${out ? "text-white/90" : "text-purple-300"}`}>
          {reply.senderName || "Сообщение"}
        </span>
        <span className={`block truncate text-xs ${reply.removed ? "italic opacity-50" : "opacity-75"}`}>
          {replyLabel(reply)}
        </span>
      </span>
    </button>
  );
}
