import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { GameState, ScoreCategory } from '../types/game';

interface UseGameOptions {
  apiCall: <T>(path: string, options?: RequestInit) => Promise<T>;
  userId: number | null;
  gameId: string | null;
}

export function useGame({ apiCall, userId, gameId }: UseGameOptions) {
  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const activeGameId = useRef<string | null>(null);

  // Clear error after 4 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Fetch full game state
  const fetchGame = useCallback(async (id: string) => {
    try {
      const data = await apiCall<GameState>(`/api/game/${id}`);
      setGame(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [apiCall]);

  // Subscribe to realtime game updates
  const subscribeGame = useCallback((id: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    activeGameId.current = id;

    const channel = supabase
      .channel(`game:${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${id}` },
        async () => {
          // Refetch full game state on any game update
          if (activeGameId.current === id) {
            await fetchGame(id);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_scores', filter: `game_id=eq.${id}` },
        async () => {
          // Refetch full game state when new scores are added
          if (activeGameId.current === id) {
            await fetchGame(id);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [fetchGame]);

  // Initialize game
  useEffect(() => {
    if (gameId) {
      setLoading(true);
      fetchGame(gameId).finally(() => setLoading(false));
      subscribeGame(gameId);
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      activeGameId.current = null;
    };
  }, [gameId, fetchGame, subscribeGame]);

  // Polling fallback: refresh every 3s while game is active (realtime can miss events)
  useEffect(() => {
    if (!gameId || game?.status === 'completed') return;

    const interval = setInterval(() => {
      fetchGame(gameId);
    }, 3000);

    return () => clearInterval(interval);
  }, [gameId, game?.status, fetchGame]);

  // Roll dice
  const rollDice = useCallback(async () => {
    if (!gameId || rolling) return;
    setRolling(true);
    setError(null);

    try {
      const result = await apiCall<{
        dice_values: number[];
        current_roll: number;
        held_dice: boolean[];
      }>(`/api/game/${gameId}/roll`, { method: 'POST' });

      // Optimistic update
      setGame((prev) => prev ? {
        ...prev,
        dice_values: result.dice_values,
        current_roll: result.current_roll,
        held_dice: result.held_dice,
      } : prev);

      // Wait for animation
      setTimeout(() => setRolling(false), 400);
    } catch (err: any) {
      setError(err.message);
      setRolling(false);
    }
  }, [gameId, rolling, apiCall]);

  // Toggle hold
  const toggleHold = useCallback(async (index: number) => {
    if (!gameId) return;
    setError(null);

    try {
      const result = await apiCall<{ held_dice: boolean[] }>(`/api/game/${gameId}/hold`, {
        method: 'POST',
        body: JSON.stringify({ index }),
      });

      // Optimistic update
      setGame((prev) => prev ? { ...prev, held_dice: result.held_dice } : prev);
    } catch (err: any) {
      setError(err.message);
    }
  }, [gameId, apiCall]);

  // Score a category
  const scoreCategory = useCallback(async (category: ScoreCategory) => {
    if (!gameId) return;
    setError(null);

    try {
      const result = await apiCall<{
        scored: { category: ScoreCategory; value: number };
        game_status: string;
        winner_id?: number;
        next_player_id?: number;
      }>(`/api/game/${gameId}/score`, {
        method: 'POST',
        body: JSON.stringify({ category }),
      });

      // Refetch full state
      await fetchGame(gameId);

      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [gameId, apiCall, fetchGame]);

  // Surrender
  const surrender = useCallback(async () => {
    if (!gameId) return;
    setError(null);

    try {
      await apiCall(`/api/game/${gameId}/surrender`, { method: 'POST' });
      await fetchGame(gameId);
    } catch (err: any) {
      setError(err.message);
    }
  }, [gameId, apiCall, fetchGame]);

  // Derived state
  const isMyTurn = game?.current_player_id === userId;
  const canRoll = isMyTurn && game?.status === 'in_progress' && (game?.current_roll ?? 0) < 3;
  const canScore = isMyTurn && game?.status === 'in_progress' && (game?.current_roll ?? 0) > 0;
  const canHold = isMyTurn && game?.status === 'in_progress' && (game?.current_roll ?? 0) > 0 && (game?.current_roll ?? 0) < 3;

  // Build score maps for players
  const getPlayerScores = useCallback((playerId: number): Record<string, number> => {
    if (!game) return {};
    const map: Record<string, number> = {};
    game.scores
      .filter((s) => s.player_id === playerId)
      .forEach((s) => { map[s.category] = s.value; });
    return map;
  }, [game]);

  const getPlayerUsedCategories = useCallback((playerId: number): ScoreCategory[] => {
    if (!game) return [];
    return game.scores
      .filter((s) => s.player_id === playerId)
      .map((s) => s.category);
  }, [game]);

  return {
    game,
    setGame,
    loading,
    error,
    rolling,
    rollDice,
    toggleHold,
    scoreCategory,
    surrender,
    fetchGame,
    isMyTurn,
    canRoll,
    canScore,
    canHold,
    getPlayerScores,
    getPlayerUsedCategories,
  };
}
