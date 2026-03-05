-- ==========================================
-- YATZY V4 — Migration 003: Custom Profile (avatar emoji + display name)
-- ==========================================

-- 1. Ensure columns from migration 002 exist
ALTER TABLE players ADD COLUMN IF NOT EXISTS total_upper_bonus_count INT DEFAULT 0;

-- 2. Add custom profile fields to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT '🎲';

-- 2. Recreate leaderboard view with new fields
DROP VIEW IF EXISTS leaderboard;

CREATE VIEW leaderboard AS
SELECT
    p.id,
    p.username,
    p.first_name,
    p.last_name,
    p.photo_url,
    p.display_name,
    p.avatar_emoji,
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
