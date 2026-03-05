import { useState } from 'react';
import { motion } from 'framer-motion';
import { GameState, ScoreCategory } from '../types/game';
import { Die } from './Die';
import { ScoreCard } from './ScoreCard';
import { TurnTimer } from './TurnTimer';

interface GameBoardProps {
  game: GameState;
  myId: number;
  rolling: boolean;
  isMyTurn: boolean;
  canRoll: boolean;
  canScore: boolean;
  canHold: boolean;
  onRoll: () => void;
  onToggleHold: (index: number) => void;
  onScore: (category: ScoreCategory) => void;
  onSurrender: () => void;
  error: string | null;
}

export function GameBoard({
  game, myId, rolling, isMyTurn, canRoll, canScore, canHold,
  onRoll, onToggleHold, onScore, onSurrender, error,
}: GameBoardProps) {
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);

  const rollsLeft = 3 - game.current_roll;
  const hasRolled = game.current_roll > 0;

  const currentPlayerName = game.players.find(
    (p) => p.player_id === game.current_player_id
  )?.players?.first_name || 'Игрок';

  const myTotalScores = game.scores.filter((s) => s.player_id === myId);
  const opponentId = game.players.find((p) => p.player_id !== myId)?.player_id;
  const oppTotalScores = opponentId ? game.scores.filter((s) => s.player_id === opponentId) : [];

  const getRollButtonText = () => {
    if (!isMyTurn) return `Ход: ${currentPlayerName}`;
    if (!hasRolled) return `Бросить кубики (${rollsLeft})`;
    if (rollsLeft > 0) return `Перебросить (${rollsLeft})`;
    return 'Выберите категорию';
  };

  return (
    <div className="gradient-bg flex flex-col min-h-screen pb-4">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <TurnTimer
          turnStartedAt={game.turn_started_at}
          timeLimit={game.turn_time_limit}
          isMyTurn={isMyTurn}
        />

        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="text-accent font-bold">{myTotalScores.length}</div>
            <div className="text-[10px] text-white/40">Мои</div>
          </div>
          <div className="text-white/20">vs</div>
          <div className="text-center">
            <div className="text-white/70 font-bold">{oppTotalScores.length}</div>
            <div className="text-[10px] text-white/40">Соперник</div>
          </div>
        </div>

        <button
          onClick={() => setShowSurrenderConfirm(true)}
          className="text-white/30 hover:text-red-400 text-xs transition-colors"
        >
          Сдаться
        </button>
      </div>

      {/* Turn Indicator */}
      <motion.div
        key={game.current_player_id}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-center py-1 text-sm font-medium ${
          isMyTurn ? 'text-accent' : 'text-white/50'
        }`}
      >
        {isMyTurn ? 'Ваш ход' : `Ход соперника (${currentPlayerName})`}
        <span className="text-white/30 ml-2">
          Раунд {Math.ceil((myTotalScores.length + oppTotalScores.length + 1) / 2)}/13
        </span>
      </motion.div>

      {/* Dice Section */}
      <div className="px-4 py-4">
        <div className="flex justify-center gap-2 mb-4">
          {game.dice_values.map((value, i) => (
            <Die
              key={i}
              value={value}
              held={game.held_dice[i]}
              canHold={canHold}
              onToggle={() => onToggleHold(i)}
              rolling={rolling}
            />
          ))}
        </div>

        {/* Roll Button */}
        <button
          className={`w-full py-3 rounded-xl font-bold text-lg transition-all active:scale-95 ${
            canRoll
              ? 'btn-primary'
              : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
          onClick={canRoll ? onRoll : undefined}
          disabled={!canRoll || rolling}
        >
          {rolling ? '🎲 ...' : getRollButtonText()}
        </button>
      </div>

      {/* Score Card */}
      <div className="px-4 flex-1 overflow-y-auto">
        <ScoreCard
          players={game.players}
          scores={game.scores}
          dice={game.dice_values}
          currentPlayerId={game.current_player_id}
          myId={myId}
          canScore={canScore}
          onScore={onScore}
        />
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-2 bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm text-center"
        >
          {error}
        </motion.div>
      )}

      {/* Surrender Confirmation */}
      {showSurrenderConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
          onClick={() => setShowSurrenderConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="card max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-2">Сдаться?</h3>
            <p className="text-white/50 text-sm mb-4">
              Противник будет объявлен победителем.
            </p>
            <div className="flex gap-3">
              <button
                className="btn-secondary flex-1"
                onClick={() => setShowSurrenderConfirm(false)}
              >
                Отмена
              </button>
              <button
                className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl py-3 font-bold active:scale-95 transition-all"
                onClick={() => {
                  setShowSurrenderConfirm(false);
                  onSurrender();
                }}
              >
                Сдаться
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
