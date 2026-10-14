export const CROCODILE_USERNAME = "crocodile_game_bot";

export const API_CHATS = "https://functions.poehali.dev/50b38462-4054-480e-85a6-3d1d593be5fb";
export const API_SEND = "https://functions.poehali.dev/d2179cfe-604e-4dda-9a8e-94247336ffb6";
export const API_AUTH = "https://functions.poehali.dev/85275f0b-0f01-4c18-9133-e7e903ca579b";
export const API_TRANSCRIBE = "https://functions.poehali.dev/9c47e0da-18f9-4bab-96c3-0531023fb5cc";
export const API_PUSH = "https://functions.poehali.dev/8415601d-6478-4ed7-947d-cfbee7dfbb93";
export const SESSION_STORAGE_KEY = "trindelka_session_id";

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
];

const GIF_URL_RE = /(?:https?:\/\/[^\s]+|\/gifs\/[^\s]+)\.gif/i;

export const extractGifUrl = (text: string): string | null => {
  const trimmed = (text || "").trim();
  if (!trimmed || trimmed.includes("\n")) return null;
  const m = trimmed.match(GIF_URL_RE);
  return m && m[0] === trimmed ? m[0] : null;
};
