"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTimer = startTimer;
exports.clearTimer = clearTimer;
exports.recoverTimers = recoverTimers;
const supabase_1 = require("../lib/supabase");
const yatzyLogic_1 = require("../game/yatzyLogic");
// In-memory timer map: gameId -> NodeJS.Timeout
const timers = new Map();
const TURN_TIME_LIMIT = 60000; // 60 seconds
/**
 * Start a 60-second timer for the current turn.
 * When it expires, auto-select the least valuable category.
 */
function startTimer(gameId) {
    clearTimer(gameId);
    const timeout = setTimeout(async () => {
        timers.delete(gameId);
        await handleTimeout(gameId);
    }, TURN_TIME_LIMIT);
    timers.set(gameId, timeout);
}
/**
 * Clear the timer for a game.
 */
function clearTimer(gameId) {
    const existing = timers.get(gameId);
    if (existing) {
        clearTimeout(existing);
        timers.delete(gameId);
    }
}
/**
 * Handle what happens when a player's turn times out.
 */
async function handleTimeout(gameId) {
    try {
        // Get current game state
        const { data: game } = await supabase_1.supabase
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single();
        if (!game || game.status !== 'in_progress')
            return;
        let diceValues = game.dice_values;
        // If player hasn't rolled yet, roll for them
        if (game.current_roll === 0) {
            diceValues = (0, yatzyLogic_1.rollDice)([0, 0, 0, 0, 0], [false, false, false, false, false]);
        }
        // Get used categories for this player
        const { data: scores } = await supabase_1.supabase
            .from('game_scores')
            .select('category')
            .eq('game_id', gameId)
            .eq('player_id', game.current_player_id);
        const usedCategories = (scores || []).map((s) => s.category);
        // Auto-select the least valuable category
        const category = (0, yatzyLogic_1.autoSelectCategory)(diceValues, usedCategories);
        if (!category)
            return; // All categories filled
        const score = (0, yatzyLogic_1.calculateScore)(category, diceValues);
        // Record score
        await supabase_1.supabase.from('game_scores').insert({
            game_id: gameId,
            player_id: game.current_player_id,
            category,
            value: score,
        });
        // Check if game is complete
        const { data: allScores } = await supabase_1.supabase
            .from('game_scores')
            .select('player_id, category, value')
            .eq('game_id', gameId);
        // Get both player IDs from lobby
        const { data: lobbyPlayers } = await supabase_1.supabase
            .from('lobby_players')
            .select('player_id, turn_order')
            .eq('lobby_id', game.lobby_id)
            .order('turn_order');
        if (!lobbyPlayers || lobbyPlayers.length !== 2)
            return;
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
            const winnerId = p1Total >= p2Total ? player1Id : player2Id;
            // Update game as completed
            await supabase_1.supabase.from('games').update({
                status: 'completed',
                winner_id: winnerId,
                completed_at: new Date().toISOString(),
                dice_values: diceValues,
            }).eq('id', gameId);
            // Record results
            await supabase_1.supabase.from('game_results').insert([
                {
                    game_id: gameId,
                    player_id: player1Id,
                    total_score: p1Total,
                    upper_section_score: (0, yatzyLogic_1.computeUpperTotal)(p1ScoreMap),
                    upper_bonus: (0, yatzyLogic_1.computeUpperTotal)(p1ScoreMap) >= 63,
                    placement: p1Total >= p2Total ? 1 : 2,
                },
                {
                    game_id: gameId,
                    player_id: player2Id,
                    total_score: p2Total,
                    upper_section_score: (0, yatzyLogic_1.computeUpperTotal)(p2ScoreMap),
                    upper_bonus: (0, yatzyLogic_1.computeUpperTotal)(p2ScoreMap) >= 63,
                    placement: p2Total > p1Total ? 1 : 2,
                },
            ]);
            // Update player stats
            await updatePlayerStats(player1Id, p1Total, p1ScoreMap, winnerId === player1Id);
            await updatePlayerStats(player2Id, p2Total, p2ScoreMap, winnerId === player2Id);
            // Update lobby status
            await supabase_1.supabase.from('lobbies').update({ status: 'finished' }).eq('id', game.lobby_id);
            return;
        }
        // Switch to next player
        const nextPlayerId = game.current_player_id === player1Id ? player2Id : player1Id;
        const currentPlayerScoreCount = game.current_player_id === player1Id ? p1Scores.length : p2Scores.length;
        const nextRound = game.current_player_id === player2Id ? game.current_round + 1 : game.current_round;
        await supabase_1.supabase.from('games').update({
            current_player_id: nextPlayerId,
            current_roll: 0,
            dice_values: [0, 0, 0, 0, 0],
            held_dice: [false, false, false, false, false],
            turn_started_at: new Date().toISOString(),
            current_round: nextRound,
        }).eq('id', gameId);
        // Start timer for next player
        startTimer(gameId);
    }
    catch (err) {
        console.error(`[turnTimer] Error handling timeout for game ${gameId}:`, err);
    }
}
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
/**
 * Recover timers for in-progress games after server restart.
 */
async function recoverTimers() {
    try {
        const { data: games } = await supabase_1.supabase
            .from('games')
            .select('id, turn_started_at, turn_time_limit')
            .eq('status', 'in_progress');
        if (!games)
            return;
        const now = Date.now();
        for (const game of games) {
            const turnStart = new Date(game.turn_started_at).getTime();
            const elapsed = now - turnStart;
            const remaining = (game.turn_time_limit * 1000) - elapsed;
            if (remaining <= 0) {
                // Already expired — handle immediately
                handleTimeout(game.id);
            }
            else {
                // Set timer for remaining time
                const timeout = setTimeout(async () => {
                    timers.delete(game.id);
                    await handleTimeout(game.id);
                }, remaining);
                timers.set(game.id, timeout);
            }
        }
        console.log(`[turnTimer] Recovered timers for ${games.length} active games`);
    }
    catch (err) {
        console.error('[turnTimer] Failed to recover timers:', err);
    }
}
//# sourceMappingURL=turnTimer.js.map