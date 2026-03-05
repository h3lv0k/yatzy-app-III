import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { LobbyState } from '../types/game';

interface UseLobbyOptions {
  apiCall: <T>(path: string, options?: RequestInit) => Promise<T>;
  userId: number | null;
}

export function useLobby({ apiCall, userId }: UseLobbyOptions) {
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lobbyCodeRef = useRef<string | null>(null);

  // Clear error after 4 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Refresh lobby data from API (uses ref to avoid stale closure)
  const refreshLobby = useCallback(async () => {
    const code = lobbyCodeRef.current;
    if (!code) return;
    try {
      const data = await apiCall<LobbyState>(`/api/lobby/${code}`);
      setLobby(data);
    } catch {
      // Silently fail refresh
    }
  }, [apiCall]);

  // Subscribe to lobby realtime updates
  const subscribeLobby = useCallback((lobbyId: string) => {
    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`lobby:${lobbyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lobby_players', filter: `lobby_id=eq.${lobbyId}` },
        async () => {
          // Refetch lobby state on any lobby_players change
          await refreshLobby();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lobbies', filter: `id=eq.${lobbyId}` },
        async () => {
          // Full refetch to pick up game_id when status changes to 'playing'
          await refreshLobby();
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [refreshLobby]);

  // Create lobby
  const createLobby = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall<{ lobby_id: string; code: string; status: string }>(
        '/api/lobby',
        { method: 'POST' }
      );

      const data = await apiCall<LobbyState>(`/api/lobby/${result.code}`);
      setLobby(data);
      lobbyCodeRef.current = data.code;
      subscribeLobby(data.id);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, subscribeLobby]);

  // Join lobby by code
  const joinLobby = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiCall<{ lobby_id: string; code: string; status: string }>(
        `/api/lobby/${code}/join`,
        { method: 'POST' }
      );

      const data = await apiCall<LobbyState>(`/api/lobby/${code}`);
      setLobby(data);
      lobbyCodeRef.current = data.code;
      subscribeLobby(data.id);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, subscribeLobby]);

  // Toggle ready
  const toggleReady = useCallback(async (isReady: boolean) => {
    if (!lobby?.code) return;
    setError(null);
    try {
      await apiCall(`/api/lobby/${lobby.code}/ready`, {
        method: 'POST',
        body: JSON.stringify({ is_ready: isReady }),
      });
      await refreshLobby();
    } catch (err: any) {
      setError(err.message);
    }
  }, [lobby?.code, apiCall, refreshLobby]);

  // Start game
  const startGame = useCallback(async () => {
    if (!lobby?.code) return null;
    setError(null);
    try {
      const result = await apiCall<{ game_id: string; current_player_id: number; status: string }>(
        `/api/lobby/${lobby.code}/start`,
        { method: 'POST' }
      );
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [lobby?.code, apiCall]);

  // Leave lobby
  const leaveLobby = useCallback(async () => {
    if (!lobby?.code) return;
    try {
      await apiCall(`/api/lobby/${lobby.code}/leave`, { method: 'POST' });
    } catch {
      // Ignore
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    lobbyCodeRef.current = null;
    setLobby(null);
  }, [lobby?.code, apiCall]);

  // Polling fallback: refresh every 3s while in lobby (realtime can miss events)
  useEffect(() => {
    if (!lobby || lobby.status === 'finished' || lobby.status === 'expired') return;

    const interval = setInterval(() => {
      refreshLobby();
    }, 3000);

    return () => clearInterval(interval);
  }, [lobby?.id, lobby?.status, refreshLobby]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Derived state
  const myPlayer = lobby?.players.find((p) => p.player_id === userId) || null;
  const opponent = lobby?.players.find((p) => p.player_id !== userId) || null;
  const isHost = lobby?.host_id === userId;
  const allReady = lobby?.players.length === 2 && lobby.players.every((p) => p.is_ready);

  return {
    lobby,
    setLobby,
    loading,
    error,
    createLobby,
    joinLobby,
    toggleReady,
    startGame,
    leaveLobby,
    refreshLobby,
    myPlayer,
    opponent,
    isHost,
    allReady,
  };
}
