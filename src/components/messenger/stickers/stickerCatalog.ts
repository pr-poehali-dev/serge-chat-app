export interface StickerSet {
  id: string;
  title: string;
  icon: string;
  stickers: { path: string; title: string }[];
}

const make = (set: string, items: [string, string][]) => items.map(([file, title]) => ({ path: `/stickers/${set}/${file}.png`, title }));

export const STICKER_SETS: StickerSet[] = [
  {
    id: "animals",
    title: "Зверята",
    icon: "🐱",
    stickers: make("animals", [
      ["cat", "Кот"], ["dog", "Пёс"], ["fox", "Лиса"], ["panda", "Панда"], ["koala", "Коала"], ["frog", "Лягушка"],
      ["lion", "Лев"], ["unicorn", "Единорог"], ["penguin", "Пингвин"], ["owl", "Сова"], ["tiger", "Тигр"], ["rabbit", "Зайка"],
    ]),
  },
  {
    id: "food",
    title: "Еда",
    icon: "🍕",
    stickers: make("food", [
      ["pizza", "Пицца"], ["burger", "Бургер"], ["donut", "Пончик"], ["cake", "Тортик"], ["coffee", "Кофе"], ["beer", "Пиво"],
      ["strawberry", "Клубника"], ["apple", "Яблоко"], ["ramen", "Лапша"], ["icecream", "Мороженое"], ["chocolate", "Шоколад"], ["pancakes", "Блинчики"],
    ]),
  },
  {
    id: "hearts",
    title: "Эмоции",
    icon: "❤️",
    stickers: make("hearts", [
      ["like", "Класс"], ["clap", "Аплодисменты"], ["hooray", "Ура"], ["strong", "Сила"], ["peace", "Мир"], ["rock", "Рок"],
      ["luck", "Удачи"], ["heart", "Сердце"], ["sparkle-heart", "Сияющее сердце"], ["broken-heart", "Разбитое сердце"], ["fire", "Огонь"], ["hundred", "Сто баллов"],
    ]),
  },
  {
    id: "party",
    title: "Праздник",
    icon: "🎉",
    stickers: make("party", [
      ["party", "Хлопушка"], ["gift", "Подарок"], ["birthday", "День рождения"], ["balloon", "Шарик"], ["confetti", "Конфетти"], ["fireworks", "Салют"],
      ["trophy", "Кубок"], ["crown", "Корона"], ["gem", "Бриллиант"], ["clover", "Клевер"], ["rainbow", "Радуга"], ["star", "Звезда"],
    ]),
  },
];

const STICKER_RE =
  /^(\/stickers\/(animals|food|hearts|party)\/[a-z0-9-]{1,30}\.png|(https?:\/\/[^\s]+|\/files)\/stickers\/user\/[a-f0-9]{32}\.(png|webp|jpg))$/;

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
