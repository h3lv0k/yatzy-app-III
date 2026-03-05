"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const schemas_1 = require("../validators/schemas");
const router = (0, express_1.Router)();
/**
 * Generate a 6-character lobby code.
 */
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 to avoid confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
/**
 * Ensure player exists in the database (upsert).
 */
async function ensurePlayer(req) {
    const user = req.telegramUser;
    const { error } = await supabase_1.supabase
        .from('players')
        .upsert({
        id: user.id,
        username: user.username || null,
        first_name: user.first_name,
        last_name: user.last_name || null,
        photo_url: user.photo_url || null,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (error)
        throw new Error(`Failed to upsert player: ${error.message}`);
}
// ==========================================
// POST /api/lobby — Create lobby
// ==========================================
router.post('/', async (req, res) => {
    try {
        const user = req.telegramUser;
        await ensurePlayer(req);
        // Check if player is already in an active lobby
        const { data: existingLp } = await supabase_1.supabase
            .from('lobby_players')
            .select('lobby_id, lobbies!inner(status)')
            .eq('player_id', user.id)
            .in('lobbies.status', ['waiting', 'playing'])
            .limit(1);
        if (existingLp && existingLp.length > 0) {
            res.status(400).json({ error: 'Вы уже находитесь в активном лобби' });
            return;
        }
        const code = generateCode();
        const { data: lobby, error: lobbyErr } = await supabase_1.supabase
            .from('lobbies')
            .insert({
            code,
            host_id: user.id,
            status: 'waiting',
            max_players: 2,
        })
            .select()
            .single();
        if (lobbyErr)
            throw lobbyErr;
        // Add host as first player
        const { error: lpErr } = await supabase_1.supabase
            .from('lobby_players')
            .insert({
            lobby_id: lobby.id,
            player_id: user.id,
            turn_order: 1,
            is_ready: false,
        });
        if (lpErr)
            throw lpErr;
        res.json({
            lobby_id: lobby.id,
            code: lobby.code,
            status: lobby.status,
        });
    }
    catch (err) {
        console.error('[POST /api/lobby]', err);
        res.status(500).json({ error: 'Не удалось создать лобби' });
    }
});
// ==========================================
// GET /api/lobby/:code — Get lobby status
// ==========================================
router.get('/:code', async (req, res) => {
    try {
        const code = req.params.code.toUpperCase().trim();
        const { data: lobby, error: lobbyErr } = await supabase_1.supabase
            .from('lobbies')
            .select('*')
            .eq('code', code)
            .single();
        if (lobbyErr || !lobby) {
            res.status(404).json({ error: 'Лобби не найдено' });
            return;
        }
        const { data: players } = await supabase_1.supabase
            .from('lobby_players')
            .select('*, players(*)')
            .eq('lobby_id', lobby.id)
            .order('turn_order');
        // Get game_id if status is playing
        let gameId = null;
        if (lobby.status === 'playing') {
            const { data: game } = await supabase_1.supabase
                .from('games')
                .select('id')
                .eq('lobby_id', lobby.id)
                .eq('status', 'in_progress')
                .single();
            gameId = game?.id || null;
        }
        res.json({
            ...lobby,
            players: players || [],
            game_id: gameId,
        });
    }
    catch (err) {
        console.error('[GET /api/lobby/:code]', err);
        res.status(500).json({ error: 'Ошибка получения лобби' });
    }
});
// ==========================================
// POST /api/lobby/:code/join — Join lobby
// ==========================================
router.post('/:code/join', async (req, res) => {
    try {
        const user = req.telegramUser;
        const { code } = schemas_1.joinLobbySchema.parse({ code: req.params.code });
        await ensurePlayer(req);
        const { data: lobby, error: lobbyErr } = await supabase_1.supabase
            .from('lobbies')
            .select('*')
            .eq('code', code)
            .single();
        if (lobbyErr || !lobby) {
            res.status(404).json({ error: 'Лобби не найдено' });
            return;
        }
        if (lobby.status !== 'waiting') {
            res.status(400).json({ error: 'Игра уже началась или лобби закрыто' });
            return;
        }
        // Check expiry
        if (new Date(lobby.expires_at) < new Date()) {
            await supabase_1.supabase.from('lobbies').update({ status: 'expired' }).eq('id', lobby.id);
            res.status(400).json({ error: 'Лобби истекло' });
            return;
        }
        // Check if already in this lobby
        const { data: existingLp } = await supabase_1.supabase
            .from('lobby_players')
            .select('id')
            .eq('lobby_id', lobby.id)
            .eq('player_id', user.id);
        if (existingLp && existingLp.length > 0) {
            res.json({ lobby_id: lobby.id, code: lobby.code, status: 'already_joined' });
            return;
        }
        // Check player count
        const { count } = await supabase_1.supabase
            .from('lobby_players')
            .select('id', { count: 'exact', head: true })
            .eq('lobby_id', lobby.id);
        if ((count || 0) >= 2) {
            res.status(400).json({ error: 'Лобби заполнено' });
            return;
        }
        // Add second player
        const { error: lpErr } = await supabase_1.supabase
            .from('lobby_players')
            .insert({
            lobby_id: lobby.id,
            player_id: user.id,
            turn_order: 2,
            is_ready: false,
        });
        if (lpErr)
            throw lpErr;
        res.json({
            lobby_id: lobby.id,
            code: lobby.code,
            status: 'joined',
        });
    }
    catch (err) {
        console.error('[POST /api/lobby/:code/join]', err);
        res.status(500).json({ error: 'Не удалось присоединиться к лобби' });
    }
});
// ==========================================
// POST /api/lobby/:code/ready — Toggle ready
// ==========================================
router.post('/:code/ready', async (req, res) => {
    try {
        const user = req.telegramUser;
        const code = req.params.code.toUpperCase().trim();
        const { is_ready } = schemas_1.readySchema.parse(req.body);
        const { data: lobby } = await supabase_1.supabase
            .from('lobbies')
            .select('id, status')
            .eq('code', code)
            .single();
        if (!lobby || lobby.status !== 'waiting') {
            res.status(400).json({ error: 'Лобби не найдено или уже начато' });
            return;
        }
        const { error } = await supabase_1.supabase
            .from('lobby_players')
            .update({ is_ready })
            .eq('lobby_id', lobby.id)
            .eq('player_id', user.id);
        if (error)
            throw error;
        res.json({ ok: true, is_ready });
    }
    catch (err) {
        console.error('[POST /api/lobby/:code/ready]', err);
        res.status(500).json({ error: 'Ошибка обновления готовности' });
    }
});
// ==========================================
// POST /api/lobby/:code/start — Start game
// ==========================================
router.post('/:code/start', async (req, res) => {
    try {
        const user = req.telegramUser;
        const code = req.params.code.toUpperCase().trim();
        const { data: lobby } = await supabase_1.supabase
            .from('lobbies')
            .select('*')
            .eq('code', code)
            .single();
        if (!lobby) {
            res.status(404).json({ error: 'Лобби не найдено' });
            return;
        }
        if (lobby.status !== 'waiting') {
            res.status(400).json({ error: 'Игра уже начата' });
            return;
        }
        if (lobby.host_id !== user.id) {
            res.status(403).json({ error: 'Только хост может начать игру' });
            return;
        }
        // Check both players are ready
        const { data: players } = await supabase_1.supabase
            .from('lobby_players')
            .select('*')
            .eq('lobby_id', lobby.id)
            .order('turn_order');
        if (!players || players.length !== 2) {
            res.status(400).json({ error: 'Нужно ровно 2 игрока для старта' });
            return;
        }
        if (!players.every((p) => p.is_ready)) {
            res.status(400).json({ error: 'Оба игрока должны быть готовы' });
            return;
        }
        // Randomly determine who goes first
        const firstPlayerIndex = Math.random() < 0.5 ? 0 : 1;
        const firstPlayerId = players[firstPlayerIndex].player_id;
        // Create game
        const { data: game, error: gameErr } = await supabase_1.supabase
            .from('games')
            .insert({
            lobby_id: lobby.id,
            status: 'in_progress',
            current_round: 1,
            current_player_id: firstPlayerId,
            current_roll: 0,
            dice_values: [0, 0, 0, 0, 0],
            held_dice: [false, false, false, false, false],
            turn_started_at: new Date().toISOString(),
            turn_time_limit: 60,
        })
            .select()
            .single();
        if (gameErr)
            throw gameErr;
        // Update lobby status
        await supabase_1.supabase
            .from('lobbies')
            .update({ status: 'playing', started_at: new Date().toISOString() })
            .eq('id', lobby.id);
        // Start turn timer
        const { startTimer } = await Promise.resolve().then(() => __importStar(require('../services/turnTimer')));
        startTimer(game.id);
        res.json({
            game_id: game.id,
            current_player_id: firstPlayerId,
            status: 'started',
        });
    }
    catch (err) {
        console.error('[POST /api/lobby/:code/start]', err);
        res.status(500).json({ error: 'Не удалось начать игру' });
    }
});
// ==========================================
// POST /api/lobby/:code/leave — Leave lobby
// ==========================================
router.post('/:code/leave', async (req, res) => {
    try {
        const user = req.telegramUser;
        const code = req.params.code.toUpperCase().trim();
        const { data: lobby } = await supabase_1.supabase
            .from('lobbies')
            .select('*')
            .eq('code', code)
            .single();
        if (!lobby) {
            res.status(404).json({ error: 'Лобби не найдено' });
            return;
        }
        // Remove player from lobby
        await supabase_1.supabase
            .from('lobby_players')
            .delete()
            .eq('lobby_id', lobby.id)
            .eq('player_id', user.id);
        // Check remaining players
        const { data: remaining } = await supabase_1.supabase
            .from('lobby_players')
            .select('player_id')
            .eq('lobby_id', lobby.id);
        if (!remaining || remaining.length === 0) {
            // No players left — expire lobby
            await supabase_1.supabase.from('lobbies').update({ status: 'expired' }).eq('id', lobby.id);
        }
        else if (lobby.host_id === user.id) {
            // Host left — reassign
            await supabase_1.supabase
                .from('lobbies')
                .update({ host_id: remaining[0].player_id })
                .eq('id', lobby.id);
        }
        res.json({ ok: true });
    }
    catch (err) {
        console.error('[POST /api/lobby/:code/leave]', err);
        res.status(500).json({ error: 'Ошибка при выходе из лобби' });
    }
});
exports.default = router;
//# sourceMappingURL=lobby.js.map