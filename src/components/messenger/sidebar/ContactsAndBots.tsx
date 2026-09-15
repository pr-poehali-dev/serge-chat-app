import Icon from "@/components/ui/icon";
import { Chat, Tab } from "../types";

interface ContactsAndBotsProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  setActiveChatId: (id: number) => void;
  chats: Chat[];
  bots: Chat[];
  onOpenBotStore: () => void;
  onOpenCreateGroup: () => void;
  onRequestDeleteBot: (bot: Chat) => void;
}

export default function ContactsAndBots({
  activeTab,
  setActiveTab,
  setActiveChatId,
  chats,
  bots,
  onOpenBotStore,
  onOpenCreateGroup,
  onRequestDeleteBot,
}: ContactsAndBotsProps) {
  return (
    <>
      {/* CONTACTS */}
      {activeTab === "contacts" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs text-white/30 font-medium">КОНТАКТЫ · {chats.length}</p>
            <button
              onClick={onOpenCreateGroup}
              title="Создать группу"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:text-purple-400 hover:bg-purple-400/[0.08] transition-all"
            >
              <Icon name="Users" size={14} />
            </button>
          </div>
          <div className="space-y-1">
            {chats.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-white/[0.04] transition-all group">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${c.color}cc, ${c.color}55)` }}
                >
                  {c.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/90">{c.name}</p>
                  <p className="text-xs text-white/35">{c.online ? "онлайн" : "был(а) недавно"}</p>
                </div>
                <button
                  onClick={() => { setActiveChatId(c.id); setActiveTab("chats"); }}
                  className="opacity-0 group-hover:opacity-100 flex h-8 w-8 items-center justify-center rounded-xl gradient-btn text-white transition-all"
                >
                  <Icon name="MessageCircle" size={14} />
                </button>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.1] py-3 text-sm text-white/30 hover:text-white/60 hover:border-white/20 transition-all">
            <Icon name="UserPlus" size={16} />
            Добавить контакт
          </button>
        </div>
      )}

      {/* BOTS */}
      {activeTab === "bots" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs text-white/30 font-medium">БОТЫ · {bots.length}</p>
          </div>
          <button
            onClick={onOpenBotStore}
            className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 mb-2 border border-dashed border-purple-400/30 hover:border-purple-400/60 hover:bg-purple-400/[0.06] transition-all"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
              <Icon name="Plus" size={16} />
            </div>
            <span className="text-sm font-medium text-white/70">Добавить бота из Telegram</span>
          </button>
          <div className="space-y-1">
            {bots.length === 0 ? (
              <p className="text-center text-xs text-white/25 py-6">У вас пока нет ботов</p>
            ) : (
              bots.map((bot) => (
                <div
                  key={bot.id}
                  className="group w-full flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-white/[0.04] transition-all"
                >
                  <button
                    onClick={() => { setActiveChatId(bot.id); setActiveTab("chats"); }}
                    className="flex flex-1 items-center gap-3 min-w-0 text-left"
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg"
                      style={{ background: `${bot.color}22`, border: `1px solid ${bot.color}33` }}
                    >
                      {bot.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-white/90 truncate block">{bot.name}</span>
                      <span className="text-xs text-white/35 truncate block">{bot.lastMsg}</span>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRequestDeleteBot(bot); }}
                    className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-white/20 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
