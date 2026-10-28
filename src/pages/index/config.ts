export const CROCODILE_USERNAME = "crocodile_game_bot";

const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined) || "").replace(/\/+$/, "");
const apiUrl = (name: string, platformUrl: string) => (API_BASE ? `${API_BASE}/${name}` : platformUrl);

export const API_CHATS = apiUrl("chats", "https://functions.poehali.dev/50b38462-4054-480e-85a6-3d1d593be5fb");
export const API_SEND = apiUrl("send-message", "https://functions.poehali.dev/d2179cfe-604e-4dda-9a8e-94247336ffb6");
export const API_AUTH = apiUrl("auth", "https://functions.poehali.dev/85275f0b-0f01-4c18-9133-e7e903ca579b");
export const API_TRANSCRIBE = apiUrl("transcribe", "https://functions.poehali.dev/9c47e0da-18f9-4bab-96c3-0531023fb5cc");
export const API_PUSH = apiUrl("push", "https://functions.poehali.dev/8415601d-6478-4ed7-947d-cfbee7dfbb93");
export const SESSION_STORAGE_KEY = "trindelka_session_id";
export const SESSION_EXPIRED_KEY = "trindelka_session_expired";

export const GROUP_COLORS = ["#a855f7", "#ec4899", "#38bdf8", "#34d399", "#f59e0b", "#6366f1"];

export const EMOJI_CATEGORIES = [
  { label: "😊", title: "Смайлы", emojis: ["😀","😂","🥹","😍","🥰","😎","🤩","😏","😒","😭","😤","🤯","🥳","😴","🤔","🫡","😇","🥸","🤗","😬","🫠","🤫","🫣","🥺","😢"] },
  { label: "❤️", title: "Сердца", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💕","💞","💓","💗","💖","💘","💝","🔥","⚡","✨","🌟","💫","🎉","🎊","🎈","🎁","🏆"] },
  { label: "👍", title: "Жесты", emojis: ["👍","👎","👏","🙌","🤝","✌️","🤞","🫶","💪","🦾","🫂","👋","🤙","👌","🤌","🫰","☝️","🙏","🤲","🫴","💅","🖐️","✋","🤚","👊"] },
  { label: "🐶", title: "Животные", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐸","🐵","🙈","🙉","🙊","🐔","🦆","🦅","🦉","🦋","🐛","🐌","🐞","🐝"] },
  { label: "🍕", title: "Еда", emojis: ["🍕","🍔","🍟","🌭","🍿","🧂","🥓","🥚","🍳","🧇","🥞","🧈","🍞","🥐","🥨","🧀","🥗","🍱","🍣","🍜","🍝","🍛","🍲","🥘","🍗"] },
  { label: "⚽", title: "Спорт", emojis: ["⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸","🥊","🏆","🥇","🎯","🎮","🕹️","🎲","♟️","🎳","🏹","🛹","🛼","🚴","🤸","🧗"] },
  { label: "🌍", title: "Природа", emojis: ["🌍","🌎","🌏","🌕","🌙","⭐","🌟","☀️","🌤️","⛅","🌈","🌊","🏔️","🌋","🏖️","🏝️","🌴","🌵","🌾","🍀","🌸","🌺","🌻","🌹","🍁"] },
  { label: "🚗", title: "Транспорт", emojis: ["🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","✈️","🚀","🛸","🚂","🛳️","⛵","🚁","🛺","🏍️","🛵","🚲"] },
];

export const GIF_CATEGORIES = [
  { label: "🔥 Популярные", gifs: [
    { url: "/gifs/wow.gif", title: "Вау" },
    { url: "/gifs/cheers.gif", title: "Ура, за тебя" },
    { url: "/gifs/smile.gif", title: "Улыбка" },
    { url: "/gifs/heart.gif", title: "Сердце" },
  ]},
  { label: "😂 Смешные", gifs: [
    { url: "/gifs/cat-laptop.gif", title: "Кот и ноутбук" },
    { url: "/gifs/cat.gif", title: "Кот" },
    { url: "/gifs/black-cat.gif", title: "Чёрный кот" },
    { url: "/gifs/minions.gif", title: "Миньоны" },
  ]},
  { label: "🎉 Эмоции", gifs: [
    { url: "/gifs/party.gif", title: "Вечеринка" },
    { url: "/gifs/rick.gif", title: "Рик" },
    { url: "/gifs/thinking.gif", title: "Думаю" },
    { url: "/gifs/friends.gif", title: "Друзья" },
  ]},
  { label: "👍 Реакции", gifs: [
    { url: "/gifs/std/thumbs-up.gif", title: "Класс" },
    { url: "/gifs/std/clap.gif", title: "Аплодисменты" },
    { url: "/gifs/std/pray.gif", title: "Спасибо" },
    { url: "/gifs/std/wave.gif", title: "Привет" },
    { url: "/gifs/std/muscle.gif", title: "Сила" },
    { url: "/gifs/std/handshake.gif", title: "Договорились" },
    { url: "/gifs/std/check.gif", title: "Готово" },
    { url: "/gifs/std/eyes.gif", title: "Смотрю" },
  ]},
  { label: "😊 Эмоции", gifs: [
    { url: "/gifs/std/smile.gif", title: "Улыбка" },
    { url: "/gifs/std/joy.gif", title: "Смеюсь до слёз" },
    { url: "/gifs/std/rofl.gif", title: "Катаюсь от смеха" },
    { url: "/gifs/std/heart-eyes.gif", title: "Влюблён" },
    { url: "/gifs/std/kiss.gif", title: "Поцелуй" },
    { url: "/gifs/std/cool.gif", title: "Круто" },
    { url: "/gifs/std/star-struck.gif", title: "В восторге" },
    { url: "/gifs/std/party.gif", title: "Праздник" },
  ]},
  { label: "😮 Настроение", gifs: [
    { url: "/gifs/std/sob.gif", title: "Плачу" },
    { url: "/gifs/std/angry.gif", title: "Злюсь" },
    { url: "/gifs/std/scream.gif", title: "Ужас" },
    { url: "/gifs/std/thinking.gif", title: "Думаю" },
    { url: "/gifs/std/sleep.gif", title: "Сплю" },
    { url: "/gifs/std/mind-blown.gif", title: "Взрыв мозга" },
    { url: "/gifs/std/pleading.gif", title: "Пожалуйста" },
    { url: "/gifs/std/eyeroll.gif", title: "Закатил глаза" },
  ]},
  { label: "❤️ Любовь и праздник", gifs: [
    { url: "/gifs/std/love.gif", title: "Люблю" },
    { url: "/gifs/std/hug.gif", title: "Обнимаю" },
    { url: "/gifs/std/heart.gif", title: "Сердце" },
    { url: "/gifs/std/fire.gif", title: "Огонь" },
    { url: "/gifs/std/tada.gif", title: "Ура" },
    { url: "/gifs/std/hundred.gif", title: "Сто баллов" },
    { url: "/gifs/std/rocket.gif", title: "Поехали" },
    { url: "/gifs/std/trophy.gif", title: "Победа" },
  ]},
];

const GIF_URL_RE = /(?:https?:\/\/[^\s]+|\/gifs\/[^\s]+)\.gif(?:\?[^\s]*)?$/i;

export const extractGifUrl = (text: string): string | null => {
  const trimmed = (text || "").trim();
  if (!trimmed || trimmed.includes("\n")) return null;
  const m = trimmed.match(GIF_URL_RE);
  return m && m[0] === trimmed ? m[0] : null;
};
