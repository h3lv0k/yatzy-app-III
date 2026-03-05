# Техническое задание: Telegram Mini App «YATZY»

## 1. Общее описание

Разработать полнофункциональную **мультиплеерную** игру **Yatzy (Yahtzee)** в формате **Telegram Mini App**.
Игра строго для **2 игроков** в одной сессии. Одиночный режим отсутствует.
Бюджет — $0, используются только бесплатные сервисы.

---

## 2. Технологический стек

| Слой | Технология | Где хостится |
|------|-----------|-------------|
| Frontend | React 18+ с TypeScript, Vite | **Vercel** (CDN, статика) |
| Telegram SDK | @twa-dev/sdk | Vercel (часть фронта) |
| Backend API | Node.js + Express | **Koyeb** (живой сервер) |
| Telegram Bot | grammY (webhook) | **Koyeb** (один процесс с API) |
| Таймеры ходов | setTimeout / node-cron | **Koyeb** |
| Realtime | Supabase Realtime (WebSocket) | **Supabase** |
| База данных | PostgreSQL | **Supabase** |
| CI/CD | GitHub Actions | GitHub |
| Стилизация | Tailwind CSS | — |
| Анимации | Framer Motion | — |
| Валидация | Zod | — |

---

## 3. Архитектура

```
┌──────────────────────────────────────────────────────────────┐
│                      АРХИТЕКТУРА YATZY                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   Vercel (бесплатно)              — ФРОНТЕНД                │
│   └── 🌐 React Mini App           ← CDN, статика            │
│       URL: https://yatzy.vercel.app                          │
│                                                              │
│   Koyeb (бесплатно)               — БЭКЕНД + БОТ            │
│   ├── ⚡ Express API               ← /api/game, /api/lobby   │
│   ├── 🤖 grammY Bot (webhook)     ← POST /bot/webhook       │
│   ├── ⏱️  Turn Timer Manager       ← setTimeout (60 сек)     │
│   └── 📨 Push Notifications       ← Bot API → Telegram      │
│       URL: https://yatzy-api.koyeb.app                       │
│                                                              │
│   Supabase (бесплатно)            — ДАННЫЕ + REALTIME        │
│   ├── 🗄️  PostgreSQL              ← Все таблицы             │
│   └── 🔄 Realtime                 ← WS подписки → клиенты   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.1 Стоимость

| Компонент | Платформа | Стоимость |
|---|---|---|
| React фронтенд | Vercel (100 ГБ трафик, 100K вызовов) | $0 |
| Node.js сервер + бот | Koyeb (0.1 vCPU, 512 МБ RAM, 2 ГБ SSD) | $0 |
| PostgreSQL + Realtime | Supabase (500 МБ, безлимит API) | $0 |
| Домен фронтенда | *.vercel.app | $0 |
| Домен API | *.koyeb.app | $0 |
| CI/CD | GitHub Actions | $0 |
| **ИТОГО** | | **$0** |

---

## 4. Структура проекта

(структура сохраняется, см. предыдущую версию ТЗ; компоненты UI, API и сервер остаются те же, но с учётом 2 игроков — соответствующие экраны и проверки оптимизированы под 2 участника)

Ключевые изменения в структуре и названиях компонентов:
- Lobby и LobbyWaiting ориентированы на показ ровно 2 слотов: "Игроков: X/2".
- Компонент MultiPlayerScores рассчитан на 2 колонки (playerA / playerB).
- Валидации и проверки в API и на клиенте принимают только 2 игроков.

---

## 5. Схема базы данных (Supabase / PostgreSQL)

Изменения: лобби и ограничения изменены под строго 2 игроков.

```sql
-- ==========================================
-- ИГРОКИ
-- ==========================================
CREATE TABLE players (
    id BIGINT PRIMARY KEY,
    username TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT,
    photo_url TEXT,
    total_games INT DEFAULT 0,
    wins INT DEFAULT 0,
    best_score INT DEFAULT 0,
    total_yatzy_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ЛОББИ (строго на 2 игрока)
-- ==========================================
CREATE TABLE lobbies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,                    -- 6-символьный код ("YATZ42")
    host_id BIGINT NOT NULL REFERENCES players(id),
    status TEXT NOT NULL DEFAULT 'waiting'
        CHECK (status IN ('waiting', 'playing', 'finished', 'expired')),
    max_players INT NOT NULL DEFAULT 2
        CHECK (max_players = 2),                 -- строго 2
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes')
);

-- ==========================================
-- УЧАСТНИКИ ЛОББИ
-- ==========================================
CREATE TABLE lobby_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobby_id UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(id),
    turn_order INT NOT NULL,                      -- 1 или 2
    is_ready BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lobby_id, player_id),
    UNIQUE(lobby_id, turn_order)
);

-- ==========================================
-- ИГРОВЫЕ СЕССИИ
-- ==========================================
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobby_id UUID NOT NULL REFERENCES lobbies(id),
    status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'completed')),
    current_round INT NOT NULL DEFAULT 1,         -- 1-13
    current_player_id BIGINT NOT NULL REFERENCES players(id),
    current_roll INT NOT NULL DEFAULT 0,          -- 0-3
    dice_values INT[] DEFAULT '{0,0,0,0,0}',
    held_dice BOOLEAN[] DEFAULT '{false,false,false,false,false}',
    turn_started_at TIMESTAMPTZ DEFAULT NOW(),
    turn_time_limit INT DEFAULT 60,
    winner_id BIGINT REFERENCES players(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ==========================================
-- ОЧКИ ИГРОКОВ В СЕССИИ
-- ==========================================
CREATE TABLE game_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(id),
    category TEXT NOT NULL
        CHECK (category IN (
            'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
            'three_of_a_kind', 'four_of_a_kind', 'full_house',
            'small_straight', 'large_straight', 'yatzy', 'chance'
        )),
    value INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, player_id, category)
);

-- ==========================================
-- ИТОГИ ИГРЫ
-- ==========================================
CREATE TABLE game_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(id),
    total_score INT NOT NULL DEFAULT 0,
    upper_section_score INT NOT NULL DEFAULT 0,
    upper_bonus BOOLEAN DEFAULT FALSE,
    placement INT NOT NULL,                        -- 1 или 2
    UNIQUE(game_id, player_id)
);

-- ==========================================
-- ИНДЕКСЫ
-- ==========================================
CREATE INDEX idx_lobbies_code ON lobbies(code);
CREATE INDEX idx_lobbies_status ON lobbies(status);
CREATE INDEX idx_lobby_players_lobby ON lobby_players(lobby_id);
CREATE INDEX idx_lobby_players_player ON lobby_players(player_id);
CREATE INDEX idx_games_lobby ON games(lobby_id);
CREATE INDEX idx_games_current_player ON games(current_player_id);
CREATE INDEX idx_game_scores_game ON game_scores(game_id);
CREATE INDEX idx_game_scores_player ON game_scores(player_id);
CREATE INDEX idx_game_results_game ON game_results(game_id);

-- ==========================================
-- ПРЕДСТАВЛЕНИЕ: ТАБЛИЦА ЛИДЕРОВ
-- ==========================================
CREATE VIEW leaderboard AS
SELECT
    p.id,
    p.username,
    p.first_name,
    p.photo_url,
    p.best_score,
    p.wins,
    p.total_games,
    p.total_yatzy_count,
    CASE WHEN p.total_games > 0
        THEN ROUND(p.wins::DECIMAL / p.total_games * 100, 1)
        ELSE 0
    END as win_rate,
    RANK() OVER (ORDER BY p.wins DESC, p.best_score DESC) as rank
FROM players p
WHERE p.total_games > 0
ORDER BY p.wins DESC, p.best_score DESC;
```

---

## 6. Сервер (Koyeb) — ключевые изменения для 2 игроков

- Валидация создания лобби и присоединения: lobby.max_players = 2. При join проверяется, что в лобби меньше 2 игроков; если 2 — reject.
- Старт игры доступен, когда в лобби ровно 2 игрока и оба пометили is_ready = true.
- turn_order = 1 или 2; при старте случайно (или по хосту/рандом) распределяем, кто первый.
- При переключении хода nextPlayer = (turn_order % 2) + 1.

---

## 7. Фронтенд (изменения для 2 игроков)

- LobbyWaiting: интерфейс показывает ровно 2 слота, крупно код и статус "Игроков: X/2".
- MultiPlayerScores: 2 колонки — игрок A и игрок B; layout упрощён под две колонки.
- GameScreen: TurnIndicator чётко показывает «Ваш ход» / «Ход соперника». При non-active игроке кнопки броска/заморозки неактивны.
- UX: при отсутствии второго игрока показывать приглашение и кнопку копирования кода.

---

## 8. Правила и логика (без изменений в правилах Yatzy, только мультиплеер — 2 игрока)

- 2 игрока в одной сессии.
- 13 раундов; в каждом раунде оба игрока по очереди выполняют один ход (до 3 бросков).
- Таймер хода: 60 сек — если истёк, сервер делает autoSelectCategory и переключает ход.
- Побеждает игрок с наибольшим total_score после 13 раундов; если ничья — побеждает тот, кто раньше сделал итог (фоллоу-ап: можно определить tie-break по sum of upper section или по времени записи — договорить при реализации).

---

## 9. API Endpoints (основные — без изменений в путях)

Все те же endpoints; изменения логики:
- POST /api/lobby — создание лобби (max_players = 2)
- POST /api/lobby/:code/join — присоединение принимает до 2 игроков
- POST /api/lobby/:code/start — доступно только когда ровно 2 игрока и оба готовы

Остальные endpoints (game roll/hold/score) остаются без изменения, только проверки авторизации и соответствие current_player_id — обязательны.

---

## 10. Таймеры и восстановление (без изменений, но с учётом 2 игроков)

- Таймер в памяти Koyeb; при рестарте сервера — проверка записанных turn_started_at.
- AutoSelectCategory при тайм-ауте (запись наименее ценную доступную категорию) — логика не меняется.

---

## 11. Edge-cases (адаптированы под 2 игрока)

1. Второй игрок не пришёл — лобби может истечь через LOBBY_EXPIRE_MINUTES (15 минут).
2. Один игрок вышел до старта — лобби в статусе waiting с 1 игроком.
3. Один игрок отключился во время игры — его ходы выполняются авто-логикой по таймеру; если второй остаётся, игра продолжается.
4. Если один игрок оставлен единственным в игре (другой вышел), оставшийся автоматически считается победителем, или игра завершается по договорённому правилу (параметр в ТЗ).
5. Хост покинул лобби — переназначается второй игрок автоматически (host_id ← remaining player).

---

## 12. Порядок реализации (коротко)

Фазы остаются те же, но при реализации логики лобби и проверок учесть, что max_players = 2 и старту нужно ровно 2 ready игрока.

---

## 13. Критерии готовности (для 2 игроков)

- [ ] Лобби: создание, join по коду/ссылке, зал ожидания, оба игрока должны быть ready для старта.
- [ ] Мультиплеер: ровно 2 игрока, поочерёдные ходы, Realtime обновления.
- [ ] Игра: 13 раундов, все 13 категорий, корректный подсчёт.
- [ ] Таймер хода 60 сек с автозаписью.
- [ ] UI под 2 игрока: Lobby (2/2), MultiPlayerScores (2 колонки).
- [ ] Бот: команды, deep link, push-уведомления.
- [ ] Безопасность: initData верифицируется, кубики генерируются только на сервере.

---

## 14. Дополнительно (рекомендации)

- В game_events логировать действия — удобно для разбирательств.
- Для tie-break можно заранее прописать правило (upper section, либо earlier submit).
- Для UX: при создании лобби предлагать отправить приглашение в чат/DM второму игроку.

---