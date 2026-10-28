export interface StickerSet {
  id: string;
  title: string;
  icon: string;
  stickers: { path: string; title: string }[];
}

const make = (set: string, items: [string, string][]) => items.map(([file, title]) => ({ path: `/stickers/v2/${set}/${file}.webp`, title }));

export const STICKER_SETS: StickerSet[] = [
  {
    id: "faces",
    title: "Эмоции",
    icon: "😀",
    stickers: make("faces", [["happy", "Радость"], ["joy", "Смеюсь до слёз"], ["heart-eyes", "Влюблён"], ["star-struck", "В восторге"], ["cool", "Круто"], ["wink", "Подмигиваю"], ["kiss", "Воздушный поцелуй"], ["thinking", "Думаю"], ["pleading", "Пожалуйста"], ["sob", "Плачу"], ["scream", "Ужас"], ["mind-blown", "Взрыв мозга"], ["party-face", "Праздную"], ["sleep", "Сплю"], ["angry", "Злюсь"], ["eyeroll", "Закатил глаза"], ["hug", "Обнимаю"], ["melt", "Таю"], ["salute", "Есть!"], ["love-face", "Обожаю"]]),
  },
  {
    id: "gestures",
    title: "Жесты",
    icon: "👍",
    stickers: make("gestures", [["thumbs-up", "Класс"], ["clap", "Аплодисменты"], ["pray", "Спасибо"], ["wave", "Привет"], ["muscle", "Сила"], ["handshake", "Договорились"], ["ok", "Окей"], ["victory", "Победа"], ["hands-up", "Ура"], ["eyes", "Смотрю"], ["fingers-crossed", "Держу кулачки"], ["call-me", "Позвони"], ["thumbs-down", "Не нравится"], ["point", "Вот так"], ["stop", "Стоп"], ["love-you", "Люблю"]]),
  },
  {
    id: "love",
    title: "Любовь",
    icon: "❤️",
    stickers: make("love", [["heart", "Сердце"], ["sparkle-heart", "Сияющее сердце"], ["broken-heart", "Разбитое сердце"], ["heart-fire", "Горячее сердце"], ["beating-heart", "Бьётся сердце"], ["two-hearts", "Два сердца"], ["revolving-hearts", "Кружат сердца"], ["kiss-mark", "Поцелуй"], ["love-letter", "Письмо"], ["rose", "Роза"], ["heart-arrow", "Стрела Амура"], ["bouquet", "Букет"]]),
  },
  {
    id: "party",
    title: "Праздник",
    icon: "🎉",
    stickers: make("party", [["party", "Хлопушка"], ["gift", "Подарок"], ["birthday", "День рождения"], ["balloon", "Шарик"], ["confetti", "Конфетти"], ["fireworks", "Салют"], ["trophy", "Кубок"], ["crown", "Корона"], ["gem", "Бриллиант"], ["sparkles", "Блёстки"], ["cheers", "За тебя"], ["champagne", "Шампанское"], ["christmas-tree", "Ёлка"], ["santa", "Дед Мороз"], ["medal", "Медаль"], ["ribbon", "Лента"]]),
  },
  {
    id: "animals",
    title: "Зверята",
    icon: "🐱",
    stickers: make("animals", [["cat", "Кот"], ["dog", "Пёс"], ["fox", "Лиса"], ["panda", "Панда"], ["koala", "Коала"], ["frog", "Лягушка"], ["lion", "Лев"], ["unicorn", "Единорог"], ["penguin", "Пингвин"], ["owl", "Сова"], ["tiger", "Тигр"], ["rabbit", "Зайка"], ["bear", "Мишка"], ["monkey", "Обезьянка"], ["monkey-hide", "Не смотрю"], ["hamster", "Хомяк"]]),
  },
  {
    id: "food",
    title: "Еда",
    icon: "🍕",
    stickers: make("food", [["pizza", "Пицца"], ["burger", "Бургер"], ["donut", "Пончик"], ["cake", "Тортик"], ["coffee", "Кофе"], ["beer", "Пиво"], ["strawberry", "Клубника"], ["apple", "Яблоко"], ["ramen", "Лапша"], ["icecream", "Мороженое"], ["chocolate", "Шоколад"], ["pancakes", "Блинчики"], ["avocado", "Авокадо"], ["sushi", "Суши"], ["popcorn", "Попкорн"], ["cookie", "Печенье"]]),
  },
  {
    id: "work",
    title: "Дела",
    icon: "💼",
    stickers: make("work", [["briefcase", "Работа"], ["laptop", "Ноутбук"], ["idea", "Идея"], ["rocket", "Запуск"], ["growth", "Рост"], ["done", "Готово"], ["no", "Нет"], ["warning", "Внимание"], ["wait", "Подождите"], ["calendar", "Календарь"], ["memo", "Заметка"], ["bell", "Напоминание"], ["search", "Ищу"], ["gear", "Настройка"], ["money", "Деньги"], ["phone", "Звонок"]]),
  },
  {
    id: "mood",
    title: "Настроение",
    icon: "🔥",
    stickers: make("mood", [["fire", "Огонь"], ["hundred", "Сто баллов"], ["sun", "Солнце"], ["rainbow", "Радуга"], ["rain", "Дождь"], ["snow", "Снег"], ["lightning", "Молния"], ["star", "Звезда"], ["moon", "Луна"], ["clover", "Клевер"], ["zzz", "Спокойной ночи"], ["boom", "Бум"], ["skull", "Умираю"], ["ghost", "Привидение"], ["alien", "Инопланетянин"], ["poo", "Какашка"]]),
  },
];

const LEGACY_SETS = ["animals", "food", "hearts", "party"];

const STICKER_RE = new RegExp(
  `^(\\/stickers\\/v2\\/(${STICKER_SETS.map((s) => s.id).join("|")})\\/[a-z0-9-]{1,30}\\.webp|\\/stickers\\/(${LEGACY_SETS.join("|")})\\/[a-z0-9-]{1,30}\\.png|(https?:\\/\\/[^\\s]+|\\/files)\\/stickers\\/user\\/[a-f0-9]{32}\\.(png|webp|jpg))$`
);

export const extractStickerPath = (text: string): string | null => {
  const t = (text || "").trim();
  return STICKER_RE.test(t) ? t : null;
};

export const stickerTitle = (path: string): string => {
  for (const set of STICKER_SETS) {
    const hit = set.stickers.find((s) => s.path === path);
    if (hit) return hit.title;
  }
  return "Стикер";
};
