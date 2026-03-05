"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
// ==========================================
// GET /api/leaderboard — Get top players
// ==========================================
router.get('/', async (_req, res) => {
    try {
        const { data, error } = await supabase_1.supabase
            .from('leaderboard')
            .select('*')
            .limit(50);
        if (error)
            throw error;
        res.json(data || []);
    }
    catch (err) {
        console.error('[GET /api/leaderboard]', err);
        res.status(500).json({ error: 'Ошибка получения таблицы лидеров' });
    }
});
exports.default = router;
//# sourceMappingURL=leaderboard.js.map