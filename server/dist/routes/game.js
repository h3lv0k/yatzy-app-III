"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const schemas_1 = require("../validators/schemas");
const yatzyLogic_1 = require("../game/yatzyLogic");
const turnTimer_1 = require("../services/turnTimer");
const router = (0, express_1.Router)();
// Rate limiter: playerId -> last roll timestamp
const lastRollTime = new Map();
// ==========================================
// GET /api/game/:id — Get game state
// ==========================================
router.get('/:id', async (req, res) => {
    try {
        const gameId = req.params.id;
        const { data: game, error } = await supabase_1.supabase
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single();
        if (error || !game) {
            res.status(404).json({ error: 'Игра не найдена' });
            return;
        }
        // Get all scores
        const { data: scores } = await supabase_1.supabase
            .from('game_scores')
            .select('*')
            .eq('game_id', gameId);
        // Get players info
        const { data: lobbyPlayers } = await supabase_1.supabase
            .from('lobby_players')
            .select('player_id, turn_order, players(*)')
            .eq('lobby_id', game.lobby_id)
            .order('turn_order');
        res.json({
            ...game,
            scores: scores || [],
            players: lobbyPlayers || [],
        });
    }
    catch (err) {
        console.error('[GET /api/game/:id]', err);
        res.status(500).json({ error: 'Ошибка получения игры' });
    }
});
// ==========================================
// POST /api/game/:id/roll — Roll dice
// ==========================================
router.post('/:id/roll', async (req, res) => {
    try {
        const user = req.telegramUser;
        const gameId = req.params.id;
        // Rate limit: 300ms
        const now = Date.now();
        const last = lastRollTime.get(user.id) ?? 0;
        if (now - last < 300) {
            res.status(429).json({ error: 'Слишком быстро!' });
            return;
        }
        lastRollTime.set(user.id, now);
        const { data: game } = await supabase_1.supabase
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single();
        if (!game) {
            res.status(404).json({ error: 'Игра не найдена' });
            return;
        }
        if (game.status !== 'in_progress') {
            res.status(400).json({ error: 'Игра завершена' });
            return;
        }
        if (game.current_player_id !== user.id) {
            res.status(403).json({ error: 'Не ваш ход' });
            return;
        }
        if (game.current_roll >= 3) {
            res.status(400).json({ error: 'Нет бросков' });
            return;
        }
        const currentDice = game.dice_values;
        const heldDice = game.held_dice;
        // First roll: all dice are fresh
        const newDice = game.current_roll === 0
            ? (0, yatzyLogic_1.rollDice)([0, 0, 0, 0, 0], [false, false, false, false, false])
            : (0, yatzyLogic_1.rollDice)(currentDice, heldDice);
        const newRoll = game.current_roll + 1;
        const { data: updated, error } = await supabase_1.supabase
            .from('games')
            .update({
            dice_values: newDice,
            current_roll: newRoll,
            // Reset held on first roll
            held_dice: game.current_roll === 0 ? [false, false, false, false, false] : heldDice,
        })
            .eq('id', gameId)
            .select()
            .single();
        if (error)
            throw error;
        res.json({
            dice_values: updated.dice_values,
            current_roll: updated.current_roll,
            held_dice: updated.held_dice,
        });
    }
    catch (err) {
        console.error('[POST /api/game/:id/roll]', err);
        res.status(500).json({ error: 'Ошибка броска кубиков' });
    }
});
// ==========================================
// POST /api/game/:id/hold — Toggle hold on a die
// ==========================================
router.post('/:id/hold', async (req, res) => {
    try {
        const user = req.telegramUser;
        const gameId = req.params.id;
        const { index } = schemas_1.holdDiceSchema.parse(req.body);
        const { data: game } = await supabase_1.supabase
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single();
        if (!game) {
            res.status(404).json({ error: 'Игра не найдена' });
            return;
        }
        if (game.current_player_id !== user.id) {
            res.status(403).json({ error: 'Не ваш ход' });
            return;
        }
        if (game.current_roll === 0) {
            res.status(400).json({ error: 'Сначала бросьте кубики' });
            return;
        }
        if (game.current_roll >= 3) {
            res.status(400).json({ error: 'Использованы все броски, выберите категорию' });
            return;
        }
        const heldDice = [...game.held_dice];
        heldDice[index] = !heldDice[index];
        const { error } = await supabase_1.supabase
            .from('games')
            .update({ held_dice: heldDice })
            .eq('id', gameId);
        if (error)
            throw error;
        res.json({ held_dice: heldDice });
    }
    catch (err) {
        console.error('[POST /api/game/:id/hold]', err);
        res.status(500).json({ error: 'Ошибка удержания кубика' });
    }
});
// ==========================================
// POST /api/game/:id/score — Score a category
// ==========================================
router.post('/:id/score', async (req, res) => {
    try {
        const user = req.telegramUser;
        const gameId = req.params.id;
        const { category } = schemas_1.scoreCategorySchema.parse(req.body);
        const { data: game } = await supabase_1.supabase
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single();
        if (!game) {
            res.status(404).json({ error: 'Игра не найдена' });
            return;
        }
        if (game.status !== 'in_progress') {
            res.status(400).json({ error: 'Игра завершена' });
            return;
        }
        if (game.current_player_id !== user.id) {
            res.status(403).json({ error: 'Не ваш ход' });
            return;
        }
        if (game.current_roll === 0) {
            res.status(400).json({ error: 'Сначала бросьте кубики' });
            return;
        }
        // Check if category already used
        const { data: existingScore } = await supabase_1.supabase
            .from('game_scores')
            .select('id')
            .eq('game_id', gameId)
            .eq('player_id', user.id)
            .eq('category', category)
            .single();
        if (existingScore) {
            res.status(400).json({ error: 'Категория уже заполнена' });
            return;
        }
        // Calculate and record score
        const diceValues = game.dice_values;
        const score = (0, yatzyLogic_1.calculateScore)(category, diceValues);
        await supabase_1.supabase.from('game_scores').insert({
            game_id: gameId,
            player_id: user.id,
            category,
            value: score,
        });
        // Clear turn timer
        (0, turnTimer_1.clearTimer)(gameId);
        // Get all scores to check completion
        const { data: allScores } = await supabase_1.supabase
            .from('game_scores')
            .select('player_id, category, value')
            .eq('game_id', gameId);
        // Get both players
        const { data: lobbyPlayers } = await supabase_1.supabase
            .from('lobby_players')
            .select('player_id, turn_order')
            .eq('lobby_id', game.lobby_id)
            .order('turn_order');
        if (!lobbyPlayers || lobbyPlayers.length !== 2) {
            res.status(500).json({ error: 'Ошибка данных игры' });
            return;
        }
        const player1Id = lobbyPlayers[0].player_id;
        const player2Id = lobbyPlayers[1].player_id;
        const p1Scores = (allScores || []).filter((s) => s.player_id === player1Id);
        const p2Scores = (allScores || []).filter((s) => s.player_id === player2Id);
        const allDone = p1Scores.length === 13 && p2Scores.length === 13;
        if (allDone) {
            // Compute final scores
            const p1ScoreMap = {};
            p1Scores.forEach((s) => { p1ScoreMap[s.category] = s.value; });
            const p2ScoreMap = {};
            p2Scores.forEach((s) => { p2ScoreMap[s.category] = s.value; });
            const p1Total = (0, yatzyLogic_1.computeTotalScore)(p1ScoreMap);
            const p2Total = (0, yatzyLogic_1.computeTotalScore)(p2ScoreMap);
            // Tie-break: first player (turn_order=1) wins
            const winnerId = p1Total >= p2Total ? player1Id : player2Id;
            // Update game
            await supabase_1.supabase.from('games').update({
                status: 'completed',
                winner_id: winnerId,
                completed_at: new Date().toISOString(),
            }).eq('id', gameId);
            // Record results
            await supabase_1.supabase.from('game_results').insert([
                {
                    game_id: gameId,
                    player_id: player1Id,
                    total_score: p1Total,
                    upper_section_score: (0, yatzyLogic_1.computeUpperTotal)(p1ScoreMap),
                    upper_bonus: (0, yatzyLogic_1.computeUpperTotal)(p1ScoreMap) >= 63,
                    placement: winnerId === player1Id ? 1 : 2,
                },
                {
                    game_id: gameId,
                    player_id: player2Id,
                    total_score: p2Total,
                    upper_section_score: (0, yatzyLogic_1.computeUpperTotal)(p2ScoreMap),
                    upper_bonus: (0, yatzyLogic_1.computeUpperTotal)(p2ScoreMap) >= 63,
                    placement: winnerId === player2Id ? 1 : 2,
                },
            ]);
            // Update player stats
            await updatePlayerStats(player1Id, p1Total, p1ScoreMap, winnerId === player1Id);
            await updatePlayerStats(player2Id, p2Total, p2ScoreMap, winnerId === player2Id);
            // Update lobby
            await supabase_1.supabase.from('lobbies').update({ status: 'finished' }).eq('id', game.lobby_id);
            res.json({
                scored: { category, value: score },
                game_status: 'completed',
                winner_id: winnerId,
            });
            return;
        }
        // Switch to next player
        const nextPlayerId = user.id === player1Id ? player2Id : player1Id;
        const nextRound = user.id === player2Id ? game.current_round + 1 : game.current_round;
        await supabase_1.supabase.from('games').update({
            current_player_id: nextPlayerId,
            current_roll: 0,
            dice_values: [0, 0, 0, 0, 0],
            held_dice: [false, false, false, false, false],
            turn_started_at: new Date().toISOString(),
            current_round: nextRound,
        }).eq('id', gameId);
        // Start timer for next player
        (0, turnTimer_1.startTimer)(gameId);
        res.json({
            scored: { category, value: score },
            game_status: 'in_progress',
            next_player_id: nextPlayerId,
        });
    }
    catch (err) {
        console.error('[POST /api/game/:id/score]', err);
        res.status(500).json({ error: 'Ошибка записи очков' });
    }
});
// ==========================================
// POST /api/game/:id/surrender — Surrender
// ==========================================
router.post('/:id/surrender', async (req, res) => {
    try {
        const user = req.telegramUser;
        const gameId = req.params.id;
        const { data: game } = await supabase_1.supabase
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single();
        if (!game || game.status !== 'in_progress') {
            res.status(400).json({ error: 'Игра не найдена или уже завершена' });
            return;
        }
        (0, turnTimer_1.clearTimer)(gameId);
        // Get opponent
        const { data: lobbyPlayers } = await supabase_1.supabase
            .from('lobby_players')
            .select('player_id')
            .eq('lobby_id', game.lobby_id)
            .neq('player_id', user.id)
            .single();
        const opponentId = lobbyPlayers?.player_id;
        if (!opponentId) {
            res.status(400).json({ error: 'Противник не найден' });
            return;
        }
        await supabase_1.supabase.from('games').update({
            status: 'completed',
            winner_id: opponentId,
            completed_at: new Date().toISOString(),
        }).eq('id', gameId);
        // Update lobby
        await supabase_1.supabase.from('lobbies').update({ status: 'finished' }).eq('id', game.lobby_id);
        // Update player stats
        const { data: surrenderer } = await supabase_1.supabase.from('players').select('total_games').eq('id', user.id).single();
        if (surrenderer) {
            await supabase_1.supabase.from('players').update({
                total_games: surrenderer.total_games + 1,
                updated_at: new Date().toISOString(),
            }).eq('id', user.id);
        }
        const { data: winner } = await supabase_1.supabase.from('players').select('total_games, wins').eq('id', opponentId).single();
        if (winner) {
            await supabase_1.supabase.from('players').update({
                total_games: winner.total_games + 1,
                wins: winner.wins + 1,
                updated_at: new Date().toISOString(),
            }).eq('id', opponentId);
        }
        res.json({
            game_status: 'completed',
            winner_id: opponentId,
            surrendered: true,
        });
    }
    catch (err) {
        console.error('[POST /api/game/:id/surrender]', err);
        res.status(500).json({ error: 'Ошибка сдачи' });
    }
});
async function updatePlayerStats(playerId, totalScore, scoreMap, isWinner) {
    const { data: player } = await supabase_1.supabase
        .from('players')
        .select('total_games, wins, best_score, total_yatzy_count')
        .eq('id', playerId)
        .single();
    if (!player)
        return;
    const yatzyCount = scoreMap['yatzy'] === 50 ? 1 : 0;
    await supabase_1.supabase.from('players').update({
        total_games: player.total_games + 1,
        wins: isWinner ? player.wins + 1 : player.wins,
        best_score: Math.max(player.best_score, totalScore),
        total_yatzy_count: player.total_yatzy_count + yatzyCount,
        updated_at: new Date().toISOString(),
    }).eq('id', playerId);
}
exports.default = router;
//# sourceMappingURL=game.js.map