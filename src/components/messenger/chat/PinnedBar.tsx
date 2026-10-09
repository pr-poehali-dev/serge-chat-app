import Icon from "@/components/ui/icon";
import { PinnedMessage } from "../types";
import { replyLabel } from "./ReplyQuote";

interface PinnedBarProps {
  pinned: PinnedMessage;
  onOpen: (pinned: PinnedMessage) => void;
  onUnpin?: () => void;
}

export default function PinnedBar({ pinned, onOpen, onUnpin }: PinnedBarProps) {
  const preview = replyLabel({
    text: pinned.text || pinned.fileName || "",
    kind: pinned.kind,
  });

  return (
    <div className="glass-strong border-b border-white/[0.06] flex items-center gap-1 pl-3 sm:pl-6 pr-2 py-1.5 animate-fade-in">
      <button
        onClick={() => onOpen(pinned)}
        className="flex flex-1 min-w-0 items-center gap-3 rounded-lg py-1 text-left hover:bg-white/[0.04] transition-all"
      >
        <span className="h-8 w-0.5 shrink-0 rounded-full bg-amber-400" />
        <Icon name="Pin" size={14} className="shrink-0 text-amber-400 fill-amber-400" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold text-amber-300 truncate">
            Закреплено{pinned.senderName ? ` · ${pinned.senderName}` : ""}
          </span>
          <span className="block text-xs text-white/60 truncate">{preview}</span>
        </span>
      </button>
      {onUnpin && (
        <button
          onClick={onUnpin}
          title="Открепить"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 hover:text-white/90 hover:bg-white/[0.08] transition-all"
        >
          <Icon name="X" size={14} />
        </button>
      )}
    </div>
  );
}
