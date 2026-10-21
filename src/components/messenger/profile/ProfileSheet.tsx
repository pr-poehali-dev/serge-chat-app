import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { API_CHATS } from "@/pages/index/config";

interface Profile {
  id: number;
  displayName: string;
  login: string | null;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl?: string | null;
  moodEmoji: string;
  moodText: string;
  bio: string;
  statusText: string;
  online: boolean;
  commonGroups: { id: number; name: string }[];
  directChatId: number | null;
  isMe: boolean;
}

interface GroupInfo {
  name: string;
  description: string;
  avatar: string;
  color: string;
  avatarUrl?: string | null;
  memberCount?: number | null;
  myRole?: string | null;
}

interface ProfileSheetProps {
  sessionId: string;
  userId?: number;
  group?: GroupInfo;
  onClose: () => void;
  onWrite?: (userId: number) => void;
  onOpenChat?: (chatId: number) => void;
  onOpenMembers?: () => void;
}

const ROLE_LABEL: Record<string, string> = { owner: "Вы владелец группы", admin: "Вы администратор", member: "Вы участник" };

export default function ProfileSheet({ sessionId, userId, group, onClose, onWrite, onOpenChat, onOpenMembers }: ProfileSheetProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    setProfile(null);
    setError("");
    fetch(`${API_CHATS}?action=profile&user_id=${userId}`, { headers: { "X-Session-Id": sessionId } })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        if (!r.ok) setError(d.error || "Не удалось загрузить профиль");
        else setProfile(d.profile);
      })
      .catch(() => alive && setError("Не удалось связаться с сервером"));
    return () => {
      alive = false;
    };
  }, [userId, sessionId]);

  const Avatar = ({ url, color, initials, size }: { url?: string | null; color: string; initials: string; size: number }) =>
    url ? (
      <img src={url} alt="" className="rounded-3xl object-cover shadow-xl" style={{ width: size, height: size }} />
    ) : (
      <div
        className="flex items-center justify-center rounded-3xl font-black text-white shadow-xl"
        style={{ width: size, height: size, fontSize: size / 3, background: `linear-gradient(135deg, ${color}cc, ${color}55)` }}
      >
        {initials}
      </div>
    );

  return (
    <div
      className="fixed inset-0 z-[96] flex items-end justify-center overlay-safe sm:items-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-modal w-full max-w-sm flex-col overflow-hidden rounded-3xl animate-slide-up sm:animate-fade-in"
        style={{ background: "hsl(var(--popover) / 0.98)", border: "1px solid rgb(var(--fg) / calc(0.1 * var(--fg-gain)))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-xl text-fg/40 transition-all hover:bg-fg/[0.08] hover:text-fg/80"
        >
          <Icon name="X" size={16} />
        </button>

        <div className="flex-1 overflow-y-auto">
          {group ? (
            <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
              <Avatar url={group.avatarUrl} color={group.color} initials={group.avatar} size={96} />
              <h2 className="mt-4 text-xl font-bold text-fg/95 break-words">{group.name}</h2>
              <p className="mt-1 text-xs text-fg/40">
                Группа{group.memberCount ? ` · ${group.memberCount} уч.` : ""}
              </p>
              {group.myRole && <p className="mt-1 text-[11px] font-medium text-purple-400">{ROLE_LABEL[group.myRole] || ""}</p>}
              <div className="mt-4 w-full rounded-2xl bg-fg/[0.05] px-4 py-3 text-left">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-fg/30">Описание</p>
                <p className="text-sm leading-relaxed text-fg/80 whitespace-pre-wrap break-words">
                  {group.description || "Описания пока нет"}
                </p>
              </div>
              {onOpenMembers && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenMembers();
                  }}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl gradient-btn py-3 text-sm font-semibold text-white"
                >
                  <Icon name="Users" size={15} />
                  Участники и настройки
                </button>
              )}
            </div>
          ) : error ? (
            <p className="px-6 py-12 text-center text-sm text-red-400">{error}</p>
          ) : !profile ? (
            <div className="flex justify-center py-16">
              <Icon name="Loader" size={22} className="animate-spin text-fg/30" />
            </div>
          ) : (
            <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
              <Avatar url={profile.avatarUrl} color={profile.avatarColor} initials={profile.avatarInitials} size={96} />
              <h2 className="mt-4 flex items-center gap-2 text-xl font-bold text-fg/95">
                <span className="break-words">{profile.displayName}</span>
                {profile.moodEmoji && <span className="text-2xl leading-none">{profile.moodEmoji}</span>}
              </h2>
              {profile.login && <p className="text-xs text-fg/40">@{profile.login}</p>}
              {profile.statusText && (
                <p className={`mt-1 text-xs font-medium ${profile.online ? "text-emerald-400" : "text-fg/40"}`}>{profile.statusText}</p>
              )}

              {profile.moodText && (
                <div className="mt-4 w-full rounded-2xl bg-purple-500/10 px-4 py-3 text-left ring-1 ring-purple-400/20">
                  <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-purple-300/70">Настроение</p>
                  <p className="text-sm text-fg/85 break-words">
                    {profile.moodEmoji} {profile.moodText}
                  </p>
                </div>
              )}
              <div className="mt-3 w-full rounded-2xl bg-fg/[0.05] px-4 py-3 text-left">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-fg/30">О себе</p>
                <p className="text-sm leading-relaxed text-fg/80 whitespace-pre-wrap break-words">{profile.bio || "Пока ничего не рассказал(а)"}</p>
              </div>

              {profile.commonGroups.length > 0 && (
                <div className="mt-3 w-full text-left">
                  <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-fg/30">Общие группы</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.commonGroups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          onClose();
                          onOpenChat?.(g.id);
                        }}
                        className="max-w-full truncate rounded-xl bg-fg/[0.06] px-3 py-1.5 text-xs text-fg/75 hover:bg-fg/[0.12]"
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!profile.isMe && (
                <button
                  onClick={() => {
                    onClose();
                    if (profile.directChatId && onOpenChat) onOpenChat(profile.directChatId);
                    else onWrite?.(profile.id);
                  }}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl gradient-btn py-3 text-sm font-semibold text-white"
                >
                  <Icon name="MessageCircle" size={15} />
                  Написать
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
