import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { AuthenticatedRequest } from '../middleware/auth';
import { updateProfileSchema } from '../validators/schemas';

const router = Router();

// ==========================================
// GET /api/profile/me — Get current player profile & stats
// ==========================================
router.get('/me', async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.telegramUser!;

    // Upsert player (ensure exists)
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', user.id)
      .single();

    if (playerError || !player) {
      res.status(404).json({ error: 'Профиль не найден' });
      return;
    }

    // Get recent game results (last 10)
    const { data: recentGames } = await supabase
      .from('game_results')
      .select('game_id, total_score, upper_section_score, upper_bonus, bonus_score, placement')
      .eq('player_id', user.id)
      .order('created_at' as any, { ascending: false })
      .limit(10);

    // Calculate average score from all game_results
    const { data: allResults } = await supabase
      .from('game_results')
      .select('total_score')
      .eq('player_id', user.id);

    const avgScore = allResults && allResults.length > 0
      ? Math.round(allResults.reduce((sum, r) => sum + r.total_score, 0) / allResults.length)
      : 0;

    // Get rank from leaderboard view
    const { data: leaderboardEntry } = await supabase
      .from('leaderboard')
      .select('rank, win_rate')
      .eq('id', user.id)
      .single();

    res.json({
      id: player.id,
      username: player.username,
      first_name: player.first_name,
      last_name: player.last_name,
      photo_url: player.photo_url,
      display_name: player.display_name || null,
      avatar_emoji: player.avatar_emoji || '🎲',
      total_games: player.total_games,
      wins: player.wins,
      best_score: player.best_score,
      total_yatzy_count: player.total_yatzy_count,
      total_upper_bonus_count: player.total_upper_bonus_count ?? 0,
      avg_score: avgScore,
      win_rate: leaderboardEntry?.win_rate ?? 0,
      rank: leaderboardEntry?.rank ?? null,
      recent_games: recentGames || [],
      created_at: player.created_at,
    });
  } catch (err: any) {
    console.error('[GET /api/profile/me]', err);
    res.status(500).json({ error: 'Ошибка загрузки профиля' });
  }
});

// ==========================================
// PATCH /api/profile/me — Update display name & avatar emoji
// ==========================================
router.patch('/me', async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.telegramUser!;
    const parsed = updateProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: 'Неверные данные', details: parsed.error.flatten() });
      return;
    }

    const { display_name, avatar_emoji } = parsed.data;

    const { data: player, error: updateErr } = await supabase
      .from('players')
      .update({
        display_name,
        avatar_emoji,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateErr || !player) {
      res.status(500).json({ error: 'Не удалось обновить профиль' });
      return;
    }

    res.json({
      display_name: player.display_name,
      avatar_emoji: player.avatar_emoji,
    });
  } catch (err: any) {
    console.error('[PATCH /api/profile/me]', err);
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

export default router;
