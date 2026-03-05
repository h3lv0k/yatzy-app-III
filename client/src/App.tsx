import { useState, useCallback, useEffect } from 'react';
import { useTelegram } from './hooks/useTelegram';
import { useLobby } from './hooks/useLobby';
import { useGame } from './hooks/useGame';
import { Lobby } from './components/Lobby';
import { LobbyWaiting } from './components/LobbyWaiting';
import { GameBoard } from './components/GameBoard';
import { GameOver } from './components/GameOver';
import { Leaderboard } from './components/Leaderboard';
import { AppScreen, ScoreCategory } from './types/game';

function App() {
  const { user, apiCall, haptic, startParam } = useTelegram();
  const userId = user?.id || 12345; // dev fallback

  const [screen, setScreen] = useState<AppScreen>('lobby');
  const [gameId, setGameId] = useState<string | null>(null);

  const lobbyHook = useLobby({ apiCall, userId });
  const gameHook = useGame({ apiCall, userId, gameId });

  // Handle deep link from Telegram bot (?lobby=CODE or /start lobby_CODE)
  useEffect(() => {
    if (startParam && startParam.startsWith('lobby_')) {
      const code = startParam.replace('lobby_', '');
      lobbyHook.joinLobby(code).then((lobby) => {
        if (lobby) setScreen('waiting');
      });
    } else {
      // Check URL params
      const params = new URLSearchParams(window.location.search);
      const lobbyCode = params.get('lobby');
      if (lobbyCode) {
        lobbyHook.joinLobby(lobbyCode).then((lobby) => {
          if (lobby) setScreen('waiting');
        });
      }
    }
  }, [startParam]);

  // Watch lobby status changes -> transition to game
  useEffect(() => {
    if (lobbyHook.lobby?.status === 'playing' && lobbyHook.lobby.game_id) {
      setGameId(lobbyHook.lobby.game_id);
      setScreen('game');
    }
  }, [lobbyHook.lobby?.status, lobbyHook.lobby?.game_id]);

  // Watch game status -> transition to gameover
  useEffect(() => {
    if (gameHook.game?.status === 'completed') {
      setScreen('gameover');
    }
  }, [gameHook.game?.status]);

  // Handlers
  const handleCreateLobby = useCallback(async () => {
    haptic.impactOccurred('medium');
    const lobby = await lobbyHook.createLobby();
    if (lobby) setScreen('waiting');
  }, [lobbyHook, haptic]);

  const handleJoinLobby = useCallback(async (code: string) => {
    haptic.impactOccurred('medium');
    const lobby = await lobbyHook.joinLobby(code);
    if (lobby) setScreen('waiting');
  }, [lobbyHook, haptic]);

  const handleToggleReady = useCallback(async (ready: boolean) => {
    haptic.selectionChanged();
    await lobbyHook.toggleReady(ready);
  }, [lobbyHook, haptic]);

  const handleStartGame = useCallback(async () => {
    haptic.impactOccurred('heavy');
    const result = await lobbyHook.startGame();
    if (result?.game_id) {
      setGameId(result.game_id);
      setScreen('game');
    }
  }, [lobbyHook, haptic]);

  const handleLeaveLobby = useCallback(async () => {
    await lobbyHook.leaveLobby();
    setGameId(null);
    setScreen('lobby');
  }, [lobbyHook]);

  const handleRoll = useCallback(async () => {
    haptic.impactOccurred('medium');
    await gameHook.rollDice();
  }, [gameHook, haptic]);

  const handleToggleHold = useCallback(async (index: number) => {
    haptic.selectionChanged();
    await gameHook.toggleHold(index);
  }, [gameHook, haptic]);

  const handleScore = useCallback(async (category: ScoreCategory) => {
    haptic.notificationOccurred('success');
    await gameHook.scoreCategory(category);
  }, [gameHook, haptic]);

  const handleSurrender = useCallback(async () => {
    haptic.notificationOccurred('warning');
    await gameHook.surrender();
  }, [gameHook, haptic]);

  const handleRematch = useCallback(async () => {
    haptic.impactOccurred('heavy');
    // Return to lobby waiting
    setGameId(null);
    gameHook.setGame(null);
    if (lobbyHook.lobby) {
      await lobbyHook.refreshLobby();
      setScreen('waiting');
    } else {
      setScreen('lobby');
    }
  }, [lobbyHook, gameHook, haptic]);

  // Render
  switch (screen) {
    case 'lobby':
      return (
        <Lobby
          onCreateLobby={handleCreateLobby}
          onJoinLobby={handleJoinLobby}
          onShowLeaderboard={() => setScreen('leaderboard')}
          loading={lobbyHook.loading}
          error={lobbyHook.error}
          initialCode={startParam?.startsWith('lobby_') ? startParam.replace('lobby_', '') : null}
        />
      );

    case 'waiting':
      if (!lobbyHook.lobby) return null;
      return (
        <LobbyWaiting
          lobby={lobbyHook.lobby}
          userId={userId}
          isHost={lobbyHook.isHost}
          allReady={lobbyHook.allReady}
          onToggleReady={handleToggleReady}
          onStartGame={handleStartGame}
          onLeaveLobby={handleLeaveLobby}
          error={lobbyHook.error}
        />
      );

    case 'game':
      if (!gameHook.game) {
        return (
          <div className="gradient-bg flex items-center justify-center min-h-screen">
            <div className="text-white/40 text-lg">Загрузка игры...</div>
          </div>
        );
      }
      return (
        <GameBoard
          game={gameHook.game}
          myId={userId}
          rolling={gameHook.rolling}
          isMyTurn={gameHook.isMyTurn}
          canRoll={gameHook.canRoll}
          canScore={gameHook.canScore}
          canHold={gameHook.canHold}
          onRoll={handleRoll}
          onToggleHold={handleToggleHold}
          onScore={handleScore}
          onSurrender={handleSurrender}
          error={gameHook.error}
        />
      );

    case 'gameover':
      if (!gameHook.game) return null;
      return (
        <GameOver
          game={gameHook.game}
          myId={userId}
          onRematch={handleRematch}
          onLeaveLobby={handleLeaveLobby}
        />
      );

    case 'leaderboard':
      return (
        <Leaderboard onBack={() => setScreen('lobby')} />
      );

    default:
      return null;
  }
}

export default App;
