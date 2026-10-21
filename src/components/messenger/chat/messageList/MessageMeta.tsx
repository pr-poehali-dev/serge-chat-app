import Icon from "@/components/ui/icon";
import { Message } from "../../types";

interface MessageMetaProps {
  msg: Message;
  currentUserId?: number;
  onToggleReaction?: (messageId: number, emoji: string) => void;
  onOpenReadBy?: (messageId: number) => void;
}

export default function MessageMeta({ msg, currentUserId, onToggleReaction, onOpenReadBy }: MessageMetaProps) {
  const reactionEntries = Object.entries(msg.reactions || {}).filter(([, users]) => users.length > 0);

  return (
    <>
      {reactionEntries.length > 0 && (
        <div className={`flex flex-wrap gap-1 mt-1 ${msg.out ? "justify-end" : "justify-start"}`}>
          {reactionEntries.map(([emoji, users]) => {
            const mine = currentUserId != null && users.includes(currentUserId);
            return (
              <button
                key={emoji}
                onClick={() => onToggleReaction?.(msg.id, emoji)}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-all ${
                  mine
                    ? "bg-purple-500/25 border border-purple-400/40"
                    : "bg-fg/[0.06] border border-fg/[0.08] hover:bg-fg/[0.1]"
                }`}
              >
                <span>{emoji}</span>
                <span className="text-[10px] text-fg/50">{users.length}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className={`flex items-center gap-1 mt-1 px-1 ${msg.out ? "justify-end" : "justify-start"}`}>
        {msg.edited && !msg.removed && <span className="text-[10px] text-fg/25">изменено</span>}
        <span className="text-[10px] text-fg/25">{msg.time}</span>
        {msg.out && !msg.removed && (() => {
          const isGroupMsg = msg.recipientsCount != null && msg.recipientsCount > 0;
          const tip =
            msg.recipientsCount != null
              ? `Прочитали ${msg.readCount ?? 0} из ${msg.recipientsCount}`
              : msg.read
              ? "Прочитано"
              : msg.delivered
              ? "Доставлено"
              : "Отправлено";
          const inner = (
            <>
              <Icon
                name={msg.read || msg.delivered ? "CheckCheck" : "Check"}
                size={12}
                className={msg.read ? "text-purple-400" : "text-fg/30"}
              />
              {isGroupMsg && (
                <span className={`text-[10px] tabular-nums ${msg.read ? "text-purple-400" : "text-fg/35"}`}>
                  {msg.readCount ?? 0}/{msg.recipientsCount}
                </span>
              )}
            </>
          );
          return isGroupMsg && onOpenReadBy && msg.id < 1e12 ? (
            <button
              type="button"
              onClick={() => onOpenReadBy(msg.id)}
              title={`${tip}. Нажмите, чтобы увидеть, кто прочитал`}
              className="flex items-center gap-0.5 rounded-md px-1 py-0.5 hover:bg-fg/[0.08] transition-colors"
            >
              {inner}
            </button>
          ) : (
            <span className="flex items-center gap-0.5" title={tip}>
              {inner}
            </span>
          );
        })()}
      </div>
    </>
  );
}
