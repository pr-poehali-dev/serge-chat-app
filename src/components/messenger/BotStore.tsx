import { useState } from "react";
import Icon from "@/components/ui/icon";
import { BotInfo } from "./types";

interface BotStoreProps {
  installedUsernames: string[];
  onInstall: (bot: BotInfo) => void;
  onClose: () => void;
}

export const BOT_CATALOG: BotInfo[] = [
  {
    username: "chatgpt_ai_bot",
    name: "ChatGPT Ассистент",
    avatar: "🤖",
    color: "#34d399",
    description: "ИИ-помощник отвечает на вопросы, пишет тексты и помогает с задачами",
    category: "ИИ",
    users: "12M",
    verified: true,
  },
  {
    username: "weather_now_bot",
    name: "Погода",
    avatar: "⛅",
    color: "#38bdf8",
    description: "Точный прогноз погоды на сегодня и на неделю в любом городе",
    category: "Утилиты",
    users: "3.2M",
    verified: true,
  },
  {
    username: "translate_helper_bot",
    name: "Переводчик",
    avatar: "🌐",
    color: "#a855f7",
    description: "Мгновенный перевод текста на 100+ языков прямо в чате",
    category: "Утилиты",
    users: "5.1M",
    verified: true,
  },
  {
    username: "quiz_master_bot",
    name: "Квиз Мастер",
    avatar: "🎯",
    color: "#f59e0b",
    description: "Викторины и квизы на любую тему для вас и ваших друзей",
    category: "Игры",
    users: "890K",
    verified: false,
  },
  {
    username: "reminder_bot",
    name: "Напоминалка",
    avatar: "⏰",
    color: "#ec4899",
    description: "Ставьте напоминания и не забывайте о важных делах",
    category: "Продуктивность",
    users: "1.8M",
    verified: true,
  },
  {
    username: "currency_rates_bot",
    name: "Курсы валют",
    avatar: "💱",
    color: "#6366f1",
    description: "Актуальные курсы валют и криптовалют в реальном времени",
    category: "Финансы",
    users: "640K",
    verified: false,
  },
  {
    username: "news_daily_bot",
    name: "Новости дня",
    avatar: "📰",
    color: "#ef4444",
    description: "Свежие новости и главные события дня одной подпиской",
    category: "Новости",
    users: "2.4M",
    verified: true,
  },
  {
    username: "horoscope_bot",
    name: "Гороскоп",
    avatar: "✨",
    color: "#a855f7",
    description: "Ежедневный гороскоп для вашего знака зодиака",
    category: "Развлечения",
    users: "1.1M",
    verified: false,
  },
];

export default function BotStore({ installedUsernames, onInstall, onClose }: BotStoreProps) {
  const [search, setSearch] = useState("");

  const normalizedSearch = search.trim().replace(/^@/, "").toLowerCase();

  const filteredCatalog = normalizedSearch
    ? BOT_CATALOG.filter(
        (b) =>
          b.username.toLowerCase().includes(normalizedSearch) ||
          b.name.toLowerCase().includes(normalizedSearch)
      )
    : BOT_CATALOG;

  const exactMatchExists = BOT_CATALOG.some((b) => b.username.toLowerCase() === normalizedSearch);
  const showCustomOption = normalizedSearch.length >= 3 && !exactMatchExists;

  const handleInstallCustom = () => {
    const bot: BotInfo = {
      username: normalizedSearch,
      name: normalizedSearch.replace(/_/g, " ").replace(/bot$/i, "").trim() || normalizedSearch,
      avatar: "🤖",
      color: "#6366f1",
      description: "Бот подключён из Telegram по имени пользователя",
      category: "Другое",
      users: "—",
      verified: false,
    };
    onInstall(bot);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[80vh] rounded-3xl overflow-hidden flex flex-col animate-fade-in"
        style={{ background: "rgba(14,8,28,0.98)", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-btn">
              <Icon name="Bot" size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white/95">Боты из Telegram</h2>
              <p className="text-[11px] text-white/35">Подключите бота по имени или из каталога</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5">
            <Icon name="AtSign" size={14} className="text-purple-400" />
            <input
              className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/25 outline-none"
              placeholder="username_bot или название"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {showCustomOption && (
            <button
              onClick={handleInstallCustom}
              className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 mb-2 border border-dashed border-purple-400/30 hover:border-purple-400/60 hover:bg-purple-400/[0.06] transition-all text-left"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-500/20 text-lg">
                🤖
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/90">Подключить @{normalizedSearch}</p>
                <p className="text-xs text-white/35">Добавить бота по имени пользователя</p>
              </div>
              <Icon name="Plus" size={16} className="text-purple-400 shrink-0" />
            </button>
          )}

          {filteredCatalog.length === 0 && !showCustomOption ? (
            <p className="text-center text-xs text-white/25 py-8">Ничего не найдено</p>
          ) : (
            filteredCatalog.map((bot) => {
              const installed = installedUsernames.includes(bot.username);
              return (
                <div
                  key={bot.username}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-white/[0.04] transition-all"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg"
                    style={{ background: `${bot.color}22`, border: `1px solid ${bot.color}33` }}
                  >
                    {bot.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-white/90 truncate">{bot.name}</span>
                      {bot.verified && <Icon name="BadgeCheck" size={13} className="text-sky-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-white/35 truncate">{bot.description}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">
                      @{bot.username} · {bot.users} пользователей
                    </p>
                  </div>
                  <button
                    onClick={() => !installed && onInstall(bot)}
                    disabled={installed}
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                      installed
                        ? "bg-white/[0.06] text-white/30 cursor-default"
                        : "gradient-btn text-white hover:-translate-y-0.5"
                    }`}
                  >
                    {installed ? "Добавлен" : "Добавить"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}