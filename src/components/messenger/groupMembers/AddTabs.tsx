import Icon from "@/components/ui/icon";
import { BotInfo, DirectoryUser } from "../types";

interface AddPeopleTabProps {
  availableUsers: DirectoryUser[];
  isLocalChat: boolean;
  addingId: number | null;
  addMember: (userId: number) => Promise<void>;
}

export function AddPeopleTab({ availableUsers, isLocalChat, addingId, addMember }: AddPeopleTabProps) {
  return (
    <>
      {availableUsers.length === 0 ? (
        <p className="text-center text-xs text-fg/25 py-8">Никого не найдено</p>
      ) : (
        availableUsers.map((u) => (
          <div key={u.id} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-fg/[0.04] transition-all">
            {u.avatarUrl ? (
              <img src={u.avatarUrl} alt={u.displayName} className="h-10 w-10 shrink-0 rounded-2xl object-cover" />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${u.avatarColor}cc, ${u.avatarColor}55)` }}
              >
                {u.avatarInitials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-fg/90 truncate">{u.displayName}</p>
              <p className="text-xs text-fg/35 truncate">@{u.login}</p>
            </div>
            <button
              onClick={() => addMember(u.id)}
              disabled={isLocalChat || addingId === u.id}
              className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium gradient-btn text-white transition-all disabled:opacity-40 hover:-translate-y-0.5"
            >
              {addingId === u.id ? <Icon name="Loader" size={13} className="animate-spin" /> : "Добавить"}
            </button>
          </div>
        ))
      )}
    </>
  );
}

interface AddBotsTabProps {
  filteredBots: BotInfo[];
  installedBotUsernames: string[];
  onInstallBot: (bot: BotInfo) => void;
}

export function AddBotsTab({ filteredBots, installedBotUsernames, onInstallBot }: AddBotsTabProps) {
  return (
    <>
      {filteredBots.map((bot) => {
        const installed = installedBotUsernames.includes(bot.username);
        return (
          <div key={bot.username} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-fg/[0.04] transition-all">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg"
              style={{ background: `${bot.color}22`, border: `1px solid ${bot.color}33` }}
            >
              {bot.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-fg/90 truncate">{bot.name}</p>
              <p className="text-xs text-fg/35 truncate">{bot.description}</p>
            </div>
            <button
              onClick={() => !installed && onInstallBot(bot)}
              disabled={installed}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                installed ? "bg-fg/[0.06] text-fg/30 cursor-default" : "gradient-btn text-white hover:-translate-y-0.5"
              }`}
            >
              {installed ? "Добавлен" : "Добавить"}
            </button>
          </div>
        );
      })}
    </>
  );
}
