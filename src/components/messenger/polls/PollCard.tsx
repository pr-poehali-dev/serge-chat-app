import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { API_CHATS } from "@/pages/index/config";
import { PollData } from "../types";

interface PollCardProps {
  poll: PollData;
  out: boolean;
  canClose: boolean;
  sessionId: string | null;
  onVote?: (pollId: number, optionIds: number[]) => void;
  onClose?: (pollId: number) => void;
  onForward?: () => void;
}

interface Person {
  id: number;
  displayName: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl?: string | null;
}

export default function PollCard({ poll, out, canClose, sessionId, onVote, onClose, onForward }: PollCardProps) {
  const [linkNote, setLinkNote] = useState("");

  const [draft, setDraft] = useState<number[]>(() => poll.options.filter((o) => o.mine).map((o) => o.id));
  const [editing, setEditing] = useState(!poll.myVoted);
  const [voters, setVoters] = useState<Record<string, Person[]> | null>(null);
  const [showVoters, setShowVoters] = useState(false);

  useEffect(() => {
    setDraft(poll.options.filter((o) => o.mine).map((o) => o.id));
    if (poll.myVoted) setEditing(false);
  }, [poll.options, poll.myVoted]);

  const showResults = poll.myVoted || poll.closed;
  const canVote = !poll.closed && !!onVote;

  const toggle = (id: number) => {
    if (!canVote) return;
    if (!poll.multiple) {
      setDraft([id]);
      onVote?.(poll.id, [id]);
      return;
    }
    setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const loadVoters = async () => {
    const next = !showVoters;
    setShowVoters(next);
    if (!next || !sessionId) return;
    try {
      const res = await fetch(`${API_CHATS}?action=poll-voters&poll_id=${poll.id}`, { headers: { "X-Session-Id": sessionId } });
      const d = await res.json();
      if (res.ok) setVoters(d.voters || {});
    } catch {
      setVoters({});
    }
  };

  const copyLink = async () => {
    if (!sessionId) return;
    setLinkNote("");
    try {
      const res = await fetch(`${API_CHATS}?action=poll-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
        body: JSON.stringify({ poll_id: poll.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.code) {
        setLinkNote(d.error || "Не удалось создать ссылку");
        return;
      }
      const url = `${window.location.origin}/app?poll=${d.code}`;
      try {
        await navigator.clipboard.writeText(url);
        setLinkNote("Ссылка скопирована");
      } catch {
        window.prompt("Скопируйте ссылку на опрос", url);
        setLinkNote("");
      }
    } catch {
      setLinkNote("Не удалось связаться с сервером");
    }
    window.setTimeout(() => setLinkNote(""), 2500);
  };

  const text = out ? "text-white" : "text-fg/90";
  const sub = out ? "text-white/70" : "text-fg/45";
  const barBg = out ? "bg-white/20" : "bg-fg/[0.08]";
  const barFill = out ? "bg-white/55" : "bg-purple-500/60";

  return (
    <div className="w-[min(280px,70vw)] sm:w-72">
      <p className={`mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${sub}`}>
        <Icon name="BarChart3" size={12} />
        {poll.closed ? "Опрос завершён" : poll.multiple ? "Опрос · можно несколько" : "Опрос"}
      </p>
      <p className={`mb-3 text-sm font-semibold leading-snug break-words ${text}`}>{poll.question}</p>

      <div className="space-y-2">
        {poll.options.map((o) => {
          const picked = draft.includes(o.id);
          const interactive = canVote && (editing || !poll.myVoted);
          return (
            <button
              key={o.id}
              type="button"
              disabled={!interactive}
              onClick={() => toggle(o.id)}
              className={`relative w-full overflow-hidden rounded-xl px-3 py-2 text-left transition-all ${barBg} ${
                interactive ? "hover:brightness-110 active:scale-[0.99]" : "cursor-default"
              } ${picked && !showResults ? "ring-2 ring-purple-400" : ""}`}
            >
              {showResults && (
                <span className={`absolute inset-y-0 left-0 ${barFill} transition-all duration-500`} style={{ width: `${o.percent}%` }} />
              )}
              <span className="relative flex items-center gap-2">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center border ${poll.multiple ? "rounded-md" : "rounded-full"} ${
                    picked || o.mine ? "border-purple-400 bg-purple-500" : out ? "border-white/50" : "border-fg/30"
                  }`}
                >
                  {(picked || o.mine) && <Icon name="Check" size={10} className="text-white" />}
                </span>
                <span className={`min-w-0 flex-1 break-words text-sm ${text}`}>{o.text}</span>
                {showResults && <span className={`shrink-0 text-xs font-semibold tabular-nums ${text}`}>{o.percent}%</span>}
              </span>
            </button>
          );
        })}
      </div>

      {canVote && poll.multiple && editing && (
        <button
          type="button"
          disabled={draft.length === 0 && !poll.myVoted}
          onClick={() => {
            onVote?.(poll.id, draft);
            setEditing(false);
          }}
          className="mt-3 w-full rounded-xl bg-white/90 py-2 text-sm font-semibold text-purple-700 transition-all hover:bg-white disabled:opacity-40"
        >
          {draft.length === 0 && poll.myVoted ? "Убрать голос" : "Проголосовать"}
        </button>
      )}

      <div className={`mt-2 flex items-center justify-between gap-2 text-[11px] ${sub}`}>
        <span>
          {poll.voters === 0 ? "Пока никто не голосовал" : `Проголосовали: ${poll.voters}`}
        </span>
        <span className="flex items-center gap-2">
          {canVote && poll.myVoted && !editing && (
            <button type="button" onClick={() => setEditing(true)} className="underline-offset-2 hover:underline">
              Изменить
            </button>
          )}
          {poll.voters > 0 && (
            <button type="button" onClick={loadVoters} className="underline-offset-2 hover:underline">
              {showVoters ? "Скрыть" : "Кто"}
            </button>
          )}
          {canClose && !poll.closed && (
            <button type="button" onClick={() => onClose?.(poll.id)} className="underline-offset-2 hover:underline">
              Завершить
            </button>
          )}
        </span>
      </div>

      {(onForward || sessionId) && (
        <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] ${sub}`}>
          {onForward && (
            <button type="button" onClick={onForward} className="flex items-center gap-1 underline-offset-2 hover:underline">
              <Icon name="Forward" size={11} /> В другую группу
            </button>
          )}
          {sessionId && (
            <button type="button" onClick={copyLink} className="flex items-center gap-1 underline-offset-2 hover:underline">
              <Icon name="Link" size={11} /> Ссылка
            </button>
          )}
          {linkNote && <span>{linkNote}</span>}
        </div>
      )}

      {showVoters && voters && (
        <div className={`mt-2 space-y-2 rounded-xl p-2 ${barBg}`}>
          {poll.options.map((o) => {
            const list = voters[String(o.id)] || [];
            if (list.length === 0) return null;
            return (
              <div key={o.id}>
                <p className={`text-[11px] font-semibold ${text}`}>{o.text}</p>
                <p className={`text-[11px] leading-snug break-words ${sub}`}>{list.map((p) => p.displayName).join(", ")}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
