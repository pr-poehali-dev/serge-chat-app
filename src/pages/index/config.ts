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
  { label: "👋 Приветствия", gifs: [
    { url: "/gifs/v2/hello.gif", title: "Привет" },
    { url: "/gifs/v2/deal.gif", title: "Договорились" },
    { url: "/gifs/v2/salute.gif", title: "Есть!" },
    { url: "/gifs/v2/raise-hand.gif", title: "Рука вверх" },
    { url: "/gifs/v2/thanks.gif", title: "Спасибо" },
    { url: "/gifs/v2/smile.gif", title: "Улыбка" },
    { url: "/gifs/v2/kiss.gif", title: "Воздушный поцелуй" },
    { url: "/gifs/v2/hug.gif", title: "Обнимаю" },
  ]},
  { label: "😂 Смех и радость", gifs: [
    { url: "/gifs/v2/joy.gif", title: "Смеюсь до слёз" },
    { url: "/gifs/v2/rofl.gif", title: "Катаюсь от смеха" },
    { url: "/gifs/v2/laugh.gif", title: "Хохочу" },
    { url: "/gifs/v2/grin.gif", title: "Ухмылка" },
    { url: "/gifs/v2/wink.gif", title: "Подмигиваю" },
    { url: "/gifs/v2/cool.gif", title: "Круто" },
    { url: "/gifs/v2/party-face.gif", title: "Праздную" },
    { url: "/gifs/v2/star-struck.gif", title: "В восторге" },
  ]},
  { label: "👍 Реакции", gifs: [
    { url: "/gifs/v2/thumbs-up.gif", title: "Класс" },
    { url: "/gifs/v2/clap.gif", title: "Аплодисменты" },
    { url: "/gifs/v2/muscle.gif", title: "Сила" },
    { url: "/gifs/v2/ok.gif", title: "Окей" },
    { url: "/gifs/v2/hands-up.gif", title: "Ура" },
    { url: "/gifs/v2/done.gif", title: "Готово" },
    { url: "/gifs/v2/eyes.gif", title: "Смотрю" },
    { url: "/gifs/v2/fingers-crossed.gif", title: "Держу кулачки" },
  ]},
  { label: "😮 Удивление и мысли", gifs: [
    { url: "/gifs/v2/wow.gif", title: "Вау" },
    { url: "/gifs/v2/mind-blown.gif", title: "Взрыв мозга" },
    { url: "/gifs/v2/thinking.gif", title: "Думаю" },
    { url: "/gifs/v2/flushed.gif", title: "Смущён" },
    { url: "/gifs/v2/scream.gif", title: "Ужас" },
    { url: "/gifs/v2/suspicious.gif", title: "Сомневаюсь" },
    { url: "/gifs/v2/eyeroll.gif", title: "Закатил глаза" },
    { url: "/gifs/v2/grimace.gif", title: "Неловко" },
  ]},
  { label: "😢 Грусть и злость", gifs: [
    { url: "/gifs/v2/sob.gif", title: "Плачу" },
    { url: "/gifs/v2/cry.gif", title: "Грущу" },
    { url: "/gifs/v2/pleading.gif", title: "Пожалуйста" },
    { url: "/gifs/v2/angry.gif", title: "Злюсь" },
    { url: "/gifs/v2/huff.gif", title: "Возмущён" },
    { url: "/gifs/v2/yawn.gif", title: "Скучно" },
    { url: "/gifs/v2/sleep.gif", title: "Сплю" },
    { url: "/gifs/v2/sick.gif", title: "Болею" },
  ]},
  { label: "❤️ Любовь", gifs: [
    { url: "/gifs/v2/heart.gif", title: "Сердце" },
    { url: "/gifs/v2/heart-eyes.gif", title: "Влюблён" },
    { url: "/gifs/v2/love-face.gif", title: "Обожаю" },
    { url: "/gifs/v2/two-hearts.gif", title: "Два сердца" },
    { url: "/gifs/v2/heart-arrow.gif", title: "Стрела Амура" },
    { url: "/gifs/v2/kiss-mark.gif", title: "Поцелуй" },
    { url: "/gifs/v2/rose.gif", title: "Роза" },
    { url: "/gifs/v2/gift-heart.gif", title: "Подарок от сердца" },
  ]},
  { label: "🎉 Праздник", gifs: [
    { url: "/gifs/v2/tada.gif", title: "Ура, праздник" },
    { url: "/gifs/v2/gift.gif", title: "Подарок" },
    { url: "/gifs/v2/birthday.gif", title: "С днём рождения" },
    { url: "/gifs/v2/balloon.gif", title: "Шарик" },
    { url: "/gifs/v2/fireworks.gif", title: "Салют" },
    { url: "/gifs/v2/cheers.gif", title: "За тебя" },
    { url: "/gifs/v2/trophy.gif", title: "Победа" },
    { url: "/gifs/v2/crown.gif", title: "Корона" },
  ]},
  { label: "💼 Работа и дела", gifs: [
    { url: "/gifs/v2/briefcase.gif", title: "Отчёт" },
    { url: "/gifs/v2/laptop.gif", title: "Ноутбук" },
    { url: "/gifs/v2/idea.gif", title: "Идея" },
    { url: "/gifs/v2/rocket.gif", title: "Запуск" },
    { url: "/gifs/v2/growth.gif", title: "Рост" },
    { url: "/gifs/v2/wait.gif", title: "Подождите" },
    { url: "/gifs/v2/money.gif", title: "Деньги в глазах" },
    { url: "/gifs/v2/phone.gif", title: "Объявление" },
  ]},
  { label: "🔥 Настроение", gifs: [
    { url: "/gifs/v2/fire.gif", title: "Огонь" },
    { url: "/gifs/v2/hundred.gif", title: "Сто баллов" },
    { url: "/gifs/v2/sparkles.gif", title: "Блёстки" },
    { url: "/gifs/v2/lightning.gif", title: "Молния" },
    { url: "/gifs/v2/moon.gif", title: "Спокойной ночи" },
    { url: "/gifs/v2/sun.gif", title: "Доброе утро" },
    { url: "/gifs/v2/coffee.gif", title: "Кофе" },
    { url: "/gifs/v2/pizza.gif", title: "Пицца" },
  ]},
];

const GIF_URL_RE = /(?:https?:\/\/[^\s]+|\/gifs\/[^\s]+)\.gif(?:\?[^\s]*)?$/i;

export const extractGifUrl = (text: string): string | null => {
  const trimmed = (text || "").trim();
  if (!trimmed || trimmed.includes("\n")) return null;
  const m = trimmed.match(GIF_URL_RE);
  return m && m[0] === trimmed ? m[0] : null;
};
