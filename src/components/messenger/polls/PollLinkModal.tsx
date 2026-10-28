import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { API_CHATS } from "@/pages/index/config";
import { PollData } from "../types";
import PollCard from "./PollCard";

interface PollLinkModalProps {
  code: string;
  sessionId: string;
  onClose: () => void;
}

export default function PollLinkModal({ code, sessionId, onClose }: PollLinkModalProps) {
  const [poll, setPoll] = useState<PollData | null>(null);
  const [chatName, setChatName] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`${API_CHATS}?action=poll-by-code&code=${encodeURIComponent(code)}`, { headers: { "X-Session-Id": sessionId } })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        if (!r.ok) setError(d.error || "Не удалось открыть опрос");
        else {
          setPoll(d.poll);
          setChatName(d.chatName || null);
        }
      })
      .catch(() => alive && setError("Не удалось связаться с сервером"));
    return () => {
      alive = false;
    };
  }, [code, sessionId]);

  const vote = async (pollId: number, optionIds: number[]) => {
    setError("");
    try {
      const res = await fetch(`${API_CHATS}?action=vote-poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
        body: JSON.stringify({ poll_id: pollId, option_ids: optionIds, code }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Не удалось проголосовать");
        return;
      }
      setPoll(d.poll);
    } catch {
      setError("Не удалось связаться с сервером");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[97] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-5 animate-fade-in"
        style={{ background: "hsl(var(--popover) / 0.98)", border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-fg/95">Опрос по ссылке</h2>
            {chatName && <p className="truncate text-[11px] text-fg/40">Из группы «{chatName}»</p>}
          </div>
          <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-fg/40 hover:bg-fg/[0.06]">
            <Icon name="X" size={16} />
          </button>
        </div>
        {!poll && !error && (
          <div className="flex justify-center py-8">
            <Icon name="Loader" size={18} className="animate-spin text-fg/30" />
          </div>
        )}
        {poll && (
          <div className="rounded-2xl bg-fg/[0.05] p-3 flex justify-center">
            <PollCard poll={poll} out={false} canClose={false} sessionId={sessionId} onVote={vote} />
          </div>
        )}
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
