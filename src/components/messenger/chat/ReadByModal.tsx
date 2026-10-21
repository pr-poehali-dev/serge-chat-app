import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { API_CHATS } from "@/pages/index/config";

interface Person {
  id: number;
  displayName: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl?: string | null;
}

interface ReadByModalProps {
  messageId: number;
  sessionId: string;
  onClose: () => void;
}

function PersonRow({ p, muted }: { p: Person; muted?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
      {p.avatarUrl ? (
        <img src={p.avatarUrl} alt={p.displayName} className="h-9 w-9 shrink-0 rounded-xl object-cover" />
      ) : (
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${p.avatarColor}cc, ${p.avatarColor}55)` }}
        >
          {p.avatarInitials}
        </div>
      )}
      <p className={`min-w-0 flex-1 truncate text-sm font-medium ${muted ? "text-fg/50" : "text-fg/90"}`}>{p.displayName}</p>
    </div>
  );
}

function Section({ title, icon, color, people, muted }: { title: string; icon: string; color: string; people: Person[]; muted?: boolean }) {
  if (people.length === 0) return null;
  return (
    <div className="mb-2">
      <p className={`mb-1 flex items-center gap-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider ${color}`}>
        <Icon name={icon} size={12} />
        {title} · {people.length}
      </p>
      {people.map((p) => (
        <PersonRow key={p.id} p={p} muted={muted} />
      ))}
    </div>
  );
}

export default function ReadByModal({ messageId, sessionId, onClose }: ReadByModalProps) {
  const [data, setData] = useState<{ readers: Person[]; unread: Person[]; hidden: Person[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`${API_CHATS}?action=read-by&message_id=${messageId}`, { headers: { "X-Session-Id": sessionId } })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        if (!r.ok) setError(d.error || "Не удалось загрузить список");
        else setData(d);
      })
      .catch(() => alive && setError("Не удалось связаться с сервером"));
    return () => {
      alive = false;
    };
  }, [messageId, sessionId]);

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center overlay-safe"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="flex max-h-modal w-full max-w-sm flex-col overflow-hidden rounded-3xl animate-fade-in"
        style={{ background: "hsl(var(--popover) / 0.98)", border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-fg/[0.07] px-5 py-4">
          <h2 className="text-sm font-bold text-fg/95">Кто прочитал</h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-fg/40 transition-all hover:bg-fg/[0.06] hover:text-fg/80"
          >
            <Icon name="X" size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-3">
          {error ? (
            <p className="px-3 py-6 text-center text-xs text-red-400">{error}</p>
          ) : !data ? (
            <div className="flex justify-center py-8">
              <Icon name="Loader" size={20} className="animate-spin text-fg/30" />
            </div>
          ) : (
            <>
              <Section title="Прочитали" icon="CheckCheck" color="text-purple-400" people={data.readers} />
              <Section title="Ещё не прочитали" icon="Clock" color="text-fg/40" people={data.unread} muted />
              <Section title="Скрыли отметки" icon="EyeOff" color="text-fg/30" people={data.hidden} muted />
              {data.readers.length + data.unread.length + data.hidden.length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-fg/35">В группе больше никого нет</p>
              )}
              {data.hidden.length > 0 && (
                <p className="px-3 pt-1 text-[11px] leading-snug text-fg/30">
                  Эти участники отключили отметки о прочтении, поэтому неизвестно, видели ли они сообщение.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
