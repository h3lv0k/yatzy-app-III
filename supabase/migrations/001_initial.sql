-- ==========================================
-- YATZY V4 — Initial Database Schema
-- ==========================================

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
    code TEXT UNIQUE NOT NULL,
    host_id BIGINT NOT NULL REFERENCES players(id),
    status TEXT NOT NULL DEFAULT 'waiting'
        CHECK (status IN ('waiting', 'playing', 'finished', 'expired')),
    max_players INT NOT NULL DEFAULT 2
        CHECK (max_players = 2),
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
    turn_order INT NOT NULL,
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
    current_round INT NOT NULL DEFAULT 1,
    current_player_id BIGINT NOT NULL REFERENCES players(id),
    current_roll INT NOT NULL DEFAULT 0,
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
    placement INT NOT NULL,
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

-- ==========================================
-- ENABLE REALTIME
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE lobbies;
ALTER PUBLICATION supabase_realtime ADD TABLE lobby_players;
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE game_scores;

-- ==========================================
-- RLS POLICIES (Row Level Security)
-- ==========================================
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lobby_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- Allow read access for all authenticated/anon users
CREATE POLICY "Allow read players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow read lobbies" ON lobbies FOR SELECT USING (true);
CREATE POLICY "Allow read lobby_players" ON lobby_players FOR SELECT USING (true);
CREATE POLICY "Allow read games" ON games FOR SELECT USING (true);
CREATE POLICY "Allow read game_scores" ON game_scores FOR SELECT USING (true);
CREATE POLICY "Allow read game_results" ON game_results FOR SELECT USING (true);

-- Service role handles all writes (via server-side API)
CREATE POLICY "Service role full access players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access lobbies" ON lobbies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access lobby_players" ON lobby_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access games" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access game_scores" ON game_scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access game_results" ON game_results FOR ALL USING (true) WITH CHECK (true);
