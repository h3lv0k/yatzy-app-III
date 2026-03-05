import { useState } from 'react';
import { motion } from 'framer-motion';
import { LobbyState } from '../types/game';

interface LobbyWaitingProps {
  lobby: LobbyState;
  userId: number;
  isHost: boolean;
  allReady: boolean;
  onToggleReady: (ready: boolean) => void;
  onStartGame: () => void;
  onLeaveLobby: () => void;
  onShareInvite: () => void;
  inviteLink: string;
  error: string | null;
}

export function LobbyWaiting({
  lobby,
  userId,
  isHost,
  allReady,
  onToggleReady,
  onStartGame,
  onLeaveLobby,
  onShareInvite,
  inviteLink,
  error,
}: LobbyWaitingProps) {
  const [copied, setCopied] = useState(false);
  const myPlayer = lobby.players.find((p) => p.player_id === userId);
  const isReady = myPlayer?.is_ready ?? false;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(lobby.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = lobby.code;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="gradient-bg flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h2 className="text-2xl font-bold text-white mb-2">Зал ожидания</h2>
        <p className="text-white/50 text-sm">
          Игроков: {lobby.players.length}/2
        </p>
      </motion.div>

      {/* Lobby Code */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-sm mb-4"
      >
        <div className="text-center">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Код лобби</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-mono font-bold tracking-[0.4em] text-accent">
              {lobby.code}
            </span>
            <button
              onClick={copyCode}
              className="bg-white/10 hover:bg-white/20 rounded-lg p-2 transition-colors"
              title="Скопировать код"
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
          {lobby.players.length < 2 && (
            <div className="mt-3 space-y-2">
              <p className="text-white/40 text-xs">
                Отправьте ссылку другу для присоединения
              </p>
              <button
                onClick={onShareInvite}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2"
              >
                <span>📤</span> Пригласить друга
              </button>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inviteLink);
                  } catch {
                    const input = document.createElement('input');
                    input.value = inviteLink;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                  }
                }}
                className="w-full text-white/40 hover:text-white/60 text-xs transition-colors underline"
              >
                Скопировать ссылку
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Player Slots */}
      <div className="w-full max-w-sm space-y-3 mb-6">
        {[0, 1].map((slot) => {
          const player = lobby.players.find((p) => p.turn_order === slot + 1);
          return (
            <motion.div
              key={slot}
              initial={{ opacity: 0, x: slot === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: slot * 0.1 }}
              className={`card flex items-center justify-between ${
                player?.player_id === userId ? 'border-accent/30' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  player ? 'bg-accent/20' : 'bg-white/5'
                }`}>
                  {player ? (player.players?.avatar_emoji || '🎲') : '?'}
                </div>
                <div>
                  <p className={`font-medium ${player ? 'text-white' : 'text-white/30'}`}>
                    {player
                      ? (player.players?.display_name || player.players?.first_name || 'Игрок')
                      : 'Ожидание...'}
                  </p>
                  <p className="text-xs text-white/40">
                    {player
                      ? (player.player_id === lobby.host_id ? 'Хост' : 'Игрок')
                      : `Слот ${slot + 1}`}
                  </p>
                </div>
              </div>

              {player && (
                <div className={`text-xs font-medium px-3 py-1 rounded-full ${
                  player.is_ready
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-white/10 text-white/40'
                }`}>
                  {player.is_ready ? 'Готов' : 'Не готов'}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        <button
          className={`w-full py-3 rounded-xl font-bold text-lg transition-all active:scale-95 ${
            isReady
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'btn-primary'
          }`}
          onClick={() => onToggleReady(!isReady)}
        >
          {isReady ? '✓ Готов' : 'Готов!'}
        </button>

        {isHost && (
          <button
            className="btn-primary w-full text-lg disabled:opacity-30"
            onClick={onStartGame}
            disabled={!allReady}
          >
            {allReady ? 'Начать игру' : 'Ожидание готовности...'}
          </button>
        )}

        <button
          className="btn-secondary w-full"
          onClick={onLeaveLobby}
        >
          Покинуть лобби
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm text-center w-full max-w-sm"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}
