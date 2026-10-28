import { useState } from "react";
import Icon from "@/components/ui/icon";
import { PollData } from "../types";

interface PinnedPollProps {
  poll: PollData;
  senderName?: string | null;
  onOpen: () => void;
  onVote?: (pollId: number, optionIds: number[]) => void;
  onUnpin?: () => void;
}

export default function PinnedPoll({ poll, senderName, onOpen, onVote, onUnpin }: PinnedPollProps) {
  const [collapsed, setCollapsed] = useState(false);
  const canTapVote = !poll.closed && !poll.multiple && !!onVote;

  return (
    <div className="glass-strong border-b border-fg/[0.06] px-3 sm:px-6 py-2 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="h-8 w-0.5 shrink-0 rounded-full bg-amber-400" />
        <Icon name="Pin" size={14} className="shrink-0 text-amber-400 fill-amber-400" />
        <button onClick={onOpen} className="min-w-0 flex-1 rounded-lg py-0.5 text-left hover:bg-fg/[0.04]">
          <span className="block truncate text-[11px] font-semibold text-amber-300">
            {poll.closed ? "Закреплённый опрос · завершён" : "Закреплённый опрос"}
            {senderName ? ` · ${senderName}` : ""}
          </span>
          <span className="block truncate text-sm font-semibold text-fg/85">{poll.question}</span>
        </button>
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Показать результаты" : "Свернуть"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg/40 hover:bg-fg/[0.08] hover:text-fg/90 transition-all"
        >
          <Icon name={collapsed ? "ChevronDown" : "ChevronUp"} size={15} />
        </button>
        {onUnpin && (
          <button
            onClick={onUnpin}
            title="Открепить"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg/40 hover:bg-fg/[0.08] hover:text-fg/90 transition-all"
          >
            <Icon name="X" size={14} />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="mt-2 max-h-[32vh] space-y-1.5 overflow-y-auto pl-5">
          {poll.options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => (canTapVote ? onVote?.(poll.id, [o.id]) : onOpen())}
              className="relative block w-full overflow-hidden rounded-lg bg-fg/[0.07] px-3 py-1.5 text-left transition-all hover:brightness-110"
            >
              <span className="absolute inset-y-0 left-0 bg-purple-500/45 transition-all duration-500" style={{ width: `${o.percent}%` }} />
              <span className="relative flex items-center gap-2">
                {o.mine && <Icon name="Check" size={12} className="shrink-0 text-purple-300" />}
                <span className="min-w-0 flex-1 truncate text-xs text-fg/90">{o.text}</span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-fg/90">{o.percent}%</span>
              </span>
            </button>
          ))}
          <p className="text-[11px] text-fg/40">
            {poll.voters === 0 ? "Пока никто не голосовал" : `Проголосовали: ${poll.voters}`}
            {poll.multiple && !poll.closed ? " · можно выбрать несколько, откройте опрос" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
