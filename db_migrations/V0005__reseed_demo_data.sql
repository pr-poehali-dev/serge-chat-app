-- Seed demo data (schema was empty, tables just recreated)

INSERT INTO t_p64541051_serge_chat_app.users (username, display_name, avatar_initials, avatar_color, is_online, email, password_hash, password_salt, login, first_name, last_name) VALUES
  ('me', 'Вы', 'ВА', '#a855f7', true, 'demo@trindelka.ru', '6203f6335c1388b0fb08da0975b8de3fafdeaecc668ebb1adee96bd4157dc6c9', '3db7a5d88df6d9aa2afe38c021b4f37b', 'me', 'Вы', 'Аккаунт'),
  ('alisa', 'Алиса Морозова', 'АМ', '#a855f7', true, NULL, NULL, NULL, NULL, 'Алиса', 'Морозова'),
  ('dmitry', 'Дмитрий Ковалёв', 'ДК', '#ec4899', true, NULL, NULL, NULL, NULL, 'Дмитрий', 'Ковалёв'),
  ('maria', 'Мария Петрова', 'МП', '#34d399', false, NULL, NULL, NULL, NULL, 'Мария', 'Петрова'),
  ('ivan', 'Иван Смирнов', 'ИС', '#f59e0b', true, NULL, NULL, NULL, NULL, 'Иван', 'Смирнов');

INSERT INTO t_p64541051_serge_chat_app.chats (is_group, name, avatar_color) VALUES
  (false, 'Алиса Морозова', '#a855f7'),
  (false, 'Дмитрий Ковалёв', '#ec4899'),
  (true, 'Команда Трынделка', '#38bdf8'),
  (false, 'Мария Петрова', '#34d399'),
  (false, 'Иван Смирнов', '#f59e0b');

INSERT INTO t_p64541051_serge_chat_app.chat_members (chat_id, user_id) VALUES
  (1, 1), (1, 2),
  (2, 1), (2, 3),
  (3, 1), (3, 2), (3, 3),
  (4, 1), (4, 4),
  (5, 1), (5, 5);

INSERT INTO t_p64541051_serge_chat_app.messages (chat_id, sender_id, text, is_read, created_at) VALUES
  (1, 2, 'Привет! Как дела с проектом? 👋', true, NOW() - INTERVAL '20 minutes'),
  (1, 1, 'Всё идёт по плану, закончим к пятнице', true, NOW() - INTERVAL '18 minutes'),
  (1, 2, 'Отлично! Можешь прислать превью?', true, NOW() - INTERVAL '15 minutes'),
  (1, 1, 'Конечно, сейчас пришлю', true, NOW() - INTERVAL '12 minutes'),
  (1, 2, 'Окей, увидимся вечером 🔥', false, NOW() - INTERVAL '8 minutes'),
  (2, 1, 'Дима, привет! Как по задаче?', true, NOW() - INTERVAL '60 minutes'),
  (2, 3, 'Сделал, отправил файлы на почту', false, NOW() - INTERVAL '45 minutes'),
  (3, 2, 'Всем привет! Напоминаю — встреча сегодня', true, NOW() - INTERVAL '90 minutes'),
  (3, 1, 'Подтверждаю участие', true, NOW() - INTERVAL '80 minutes'),
  (3, 3, 'Встреча в 15:00', false, NOW() - INTERVAL '60 minutes'),
  (4, 1, 'Маша, отправил документы', true, NOW() - INTERVAL '2 days'),
  (4, 4, 'Спасибо большое!', false, NOW() - INTERVAL '2 days'),
  (5, 5, 'Привет! Когда будет готово?', false, NOW() - INTERVAL '3 days');
