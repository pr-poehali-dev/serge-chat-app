export interface CrocodileState {
  word: string;
  emoji: string;
  hints: string[];
  hintIndex: number;
  score: number;
  streak: number;
}

interface WordEntry {
  word: string;
  emoji: string;
  hints: string[];
}

const WORDS_POOL: WordEntry[] = [
  { word: "слон", emoji: "🐘", hints: ["Это животное", "Самое крупное на суше", "У него длинный хобот и большие уши"] },
  { word: "пицца", emoji: "🍕", hints: ["Это еда", "Родом из Италии", "Круглая, с сыром и начинкой"] },
  { word: "дождь", emoji: "🌧️", hints: ["Явление природы", "Падает с неба", "Мокрое и капает на зонт"] },
  { word: "гитара", emoji: "🎸", hints: ["Музыкальный инструмент", "У неё есть струны", "На ней играют пальцами или медиатором"] },
  { word: "космонавт", emoji: "🧑‍🚀", hints: ["Это профессия", "Летает в космос", "Носит скафандр и шлем"] },
  { word: "мороженое", emoji: "🍦", hints: ["Это десерт", "Едят холодным", "Тает на солнце"] },
  { word: "футбол", emoji: "⚽", hints: ["Вид спорта", "Играют ногами", "Нужен мяч и ворота"] },
  { word: "кошка", emoji: "🐱", hints: ["Это животное", "Домашний питомец", "Мяукает и ловит мышей"] },
  { word: "самолёт", emoji: "✈️", hints: ["Вид транспорта", "Летает в небе", "У него есть крылья и двигатели"] },
  { word: "радуга", emoji: "🌈", hints: ["Явление природы", "Появляется после дождя", "Разноцветная дуга на небе"] },
  { word: "пират", emoji: "🏴‍☠️", hints: ["Это персонаж", "Плавает на корабле", "Ищет клады и носит повязку на глазу"] },
  { word: "будильник", emoji: "⏰", hints: ["Это предмет", "Стоит у кровати", "Громко звенит по утрам"] },
  { word: "жираф", emoji: "🦒", hints: ["Это животное", "Живёт в Африке", "У него очень длинная шея"] },
  { word: "торт", emoji: "🎂", hints: ["Это еда", "Готовят на праздник", "Сладкий, часто со свечками"] },
  { word: "робот", emoji: "🤖", hints: ["Это механизм", "Умеет двигаться и говорить", "Его придумали инженеры"] },
  { word: "вулкан", emoji: "🌋", hints: ["Природный объект", "Может извергаться", "Из него течёт лава"] },
  { word: "пингвин", emoji: "🐧", hints: ["Это животное", "Живёт во льдах", "Не летает, но хорошо плавает"] },
  { word: "зонт", emoji: "☂️", hints: ["Это предмет", "Спасает от дождя", "Раскрывается и складывается"] },
  { word: "телефон", emoji: "📱", hints: ["Это устройство", "Есть почти у каждого", "Им звонят и переписываются"] },
  { word: "ковбой", emoji: "🤠", hints: ["Это персонаж", "Носит шляпу и сапоги", "Ездит верхом и пасёт скот"] },
];

const NEGATIONS = ["нет", "не то", "стоп", "хватит", "пропустить", "skip", "далее", "дальше", "новое слово", "сдаюсь"];
const HELP_WORDS = ["правила", "помощь", "help", "как играть"];
const SCORE_WORDS = ["счёт", "счет", "score", "баллы"];

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9\s]/gi, "")
    .trim();
}

function pickWord(exclude?: string): WordEntry {
  const pool = exclude ? WORDS_POOL.filter((w) => w.word !== exclude) : WORDS_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function crocodileWelcome(): { state: CrocodileState; reply: string } {
  const w = pickWord();
  const state: CrocodileState = { word: w.word, emoji: w.emoji, hints: w.hints, hintIndex: 1, score: 0, streak: 0 };
  const reply =
    "🐊 Добро пожаловать в Крокодил!\n\nЯ загадываю слово и даю подсказки, а ты пробуй угадать. Если не угадал — дам ещё одну подсказку. Команды: «пропустить», «счёт», «правила».\n\n" +
    `${w.emoji} Загадал слово! Подсказка: ${w.hints[0]}`;
  return { state, reply };
}

function startNewRound(prevScore: number, prevStreak: number, excludeWord: string): { state: CrocodileState; reply: string } {
  const w = pickWord(excludeWord);
  const state: CrocodileState = { word: w.word, emoji: w.emoji, hints: w.hints, hintIndex: 1, score: prevScore, streak: prevStreak };
  const reply = `${w.emoji} Новое слово! Подсказка: ${w.hints[0]}`;
  return { state, reply };
}

export function handleCrocodileMessage(state: CrocodileState | undefined, userText: string): { state: CrocodileState; reply: string } {
  if (!state) {
    return crocodileWelcome();
  }

  const norm = normalize(userText);

  if (HELP_WORDS.some((h) => norm.includes(h))) {
    return { state, reply: `🐊 Угадывай слово по подсказкам! Текущая подсказка: ${state.hints[state.hintIndex - 1]}\n\nКоманды: «пропустить», «счёт».` };
  }

  if (SCORE_WORDS.some((s) => norm.includes(s))) {
    return { state, reply: `🏆 Твой счёт: ${state.score} очков, серия угаданных подряд: ${state.streak}` };
  }

  if (NEGATIONS.some((n) => norm.includes(n))) {
    const { state: newState, reply } = startNewRound(state.score, 0, state.word);
    return { state: newState, reply: `Ладно, это было «${state.word}» 🐊\n\n${reply}` };
  }

  const guessMatches = norm === normalize(state.word) || norm.split(/\s+/).includes(normalize(state.word));

  if (guessMatches) {
    const newScore = state.score + Math.max(4 - state.hintIndex, 1);
    const newStreak = state.streak + 1;
    const { state: newState, reply } = startNewRound(newScore, newStreak, state.word);
    return {
      state: newState,
      reply: `🎉 Правильно! Это было «${state.word}». Счёт: ${newScore} (серия: ${newStreak})\n\n${reply}`,
    };
  }

  if (state.hintIndex < state.hints.length) {
    const nextHint = state.hints[state.hintIndex];
    return {
      state: { ...state, hintIndex: state.hintIndex + 1 },
      reply: `Мимо! 🙅 Ещё подсказка: ${nextHint}`,
    };
  }

  const { state: newState, reply } = startNewRound(state.score, 0, state.word);
  return {
    state: newState,
    reply: `Подсказки закончились 😅 Это было «${state.word}». Счёт: ${state.score}\n\n${reply}`,
  };
}
