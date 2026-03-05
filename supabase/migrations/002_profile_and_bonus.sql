-- ==========================================
-- YATZY V4 — Migration 002: Profile & Upper Bonus
-- ==========================================

-- 1. Add bonus_score column to game_results
ALTER TABLE game_results ADD COLUMN IF NOT EXISTS bonus_score INT NOT NULL DEFAULT 0;

-- 2. Add total_upper_bonus_count to players for profile stats
ALTER TABLE players ADD COLUMN IF NOT EXISTS total_upper_bonus_count INT DEFAULT 0;

-- 3. Recreate leaderboard view with new field
DROP VIEW IF EXISTS leaderboard;

CREATE VIEW leaderboard AS
SELECT
    p.id,
    p.username,
    p.first_name,
    p.last_name,
    p.photo_url,
    p.best_score,
    p.wins,
    p.total_games,
    p.total_yatzy_count,
    p.total_upper_bonus_count,
    CASE WHEN p.total_games > 0
        THEN ROUND(p.wins::DECIMAL / p.total_games * 100, 1)
        ELSE 0
    END as win_rate,
    RANK() OVER (ORDER BY p.wins DESC, p.best_score DESC) as rank
FROM players p
WHERE p.total_games > 0
ORDER BY p.wins DESC, p.best_score DESC;
