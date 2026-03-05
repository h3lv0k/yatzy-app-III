import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// ==========================================
// GET /api/leaderboard — Get top players
// ==========================================
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .limit(50);

    if (error) throw error;

    res.json(data || []);
  } catch (err: any) {
    console.error('[GET /api/leaderboard]', err);
    res.status(500).json({ error: 'Ошибка получения таблицы лидеров' });
  }
});

export default router;
