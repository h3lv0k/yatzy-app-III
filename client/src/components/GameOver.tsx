import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GameState } from '../types/game';
import { computeTotalScore, computeUpperTotal } from '../utils/yatzy';

interface GameOverProps {
  game: GameState;
  myId: number;
  onRematch: () => void;
  onLeaveLobby: () => void;
}

interface Particle {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

export function GameOver({ game, myId, onRematch, onLeaveLobby }: GameOverProps) {
  const isWinner = game.winner_id === myId;

  // Build score maps
  const playerResults = game.players.map((p) => {
    const scoreMap: Record<string, number> = {};
    game.scores
      .filter((s) => s.player_id === p.player_id)
      .forEach((s) => { scoreMap[s.category] = s.value; });
    const total = computeTotalScore(scoreMap);
    const upperTotal = computeUpperTotal(scoreMap);
    const hasBonus = upperTotal >= 63;
    return {
      ...p,
      total,
      upperTotal,
      hasBonus,
      bonusScore: hasBonus ? 35 : 0,
      isWinner: p.player_id === game.winner_id,
      isMe: p.player_id === myId,
    };
  }).sort((a, b) => b.total - a.total);

  // Particles
  const particles = useMemo<Particle[]>(() => {
    const emojis = isWinner
      ? ['✨', '🎉', '🏆', '⭐', '🎊', '💫', '🌟']
      : ['😢', '💔', '🥈', '☁️'];
    const count = isWinner ? 24 : 16;

    return Array.from({ length: count }, (_, i) => ({
      id: i,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2.5 + Math.random() * 2.5,
      size: 14 + Math.random() * 16,
    }));
  }, [isWinner]);

  return (
    <div className="gradient-bg flex flex-col items-center justify-center min-h-screen px-4 py-8 relative overflow-hidden">
      {/* Particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: -30,
            fontSize: p.size,
          }}
          initial={{ y: -30, opacity: 1 }}
          animate={{ y: '100vh', opacity: [1, 1, 0] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'linear',
            repeat: Infinity,
            opacity: {
              duration: p.duration,
              times: [0, 0.7, 1],
              ease: 'linear',
              repeat: Infinity,
              delay: p.delay,
            },
          }}
        >
          {p.emoji}
        </motion.div>
      ))}

      {/* Result */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 12 }}
        className="text-center mb-8 z-10"
      >
        <div className="text-7xl mb-4">
          {isWinner ? '🏆' : '😔'}
        </div>
        <h1 className={`text-3xl font-extrabold ${isWinner ? 'text-accent' : 'text-white/70'}`}>
          {isWinner ? 'Вы победили!' : 'Вы проиграли'}
        </h1>
      </motion.div>

      {/* Player Results */}
      <div className="w-full max-w-sm space-y-3 mb-8 z-10">
        {playerResults.map((p, i) => (
          <motion.div
            key={p.player_id}
            initial={{ opacity: 0, x: i === 0 ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.15 }}
            className={`card flex items-center justify-between ${
              p.isWinner ? 'border-accent/40 bg-accent/5' : ''
            } ${p.isMe ? 'ring-1 ring-cyan-500/30' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                p.isWinner ? 'bg-accent/20' : 'bg-white/10'
              }`}>
                {p.isWinner ? '🏆' : '🥈'}
              </div>
              <div>
                <p className={`font-medium ${p.isMe ? 'text-cyan-400' : 'text-white'}`}>
                  {p.players?.first_name || 'Игрок'}
                  {p.isMe && ' (Вы)'}
                </p>
                <p className="text-xs text-white/40">
                  {p.isWinner ? 'Победитель' : '2-е место'}
                  {p.hasBonus && (
                    <span className="text-accent ml-1">• Бонус +35</span>
                  )}
                </p>
                <p className="text-[10px] text-white/30">
                  Верх: {p.upperTotal}/63
                </p>
              </div>
            </div>
            <div className={`text-2xl font-bold font-mono ${
              p.isWinner ? 'text-accent' : 'text-white/60'
            }`}>
              {p.total}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm space-y-3 z-10"
      >
        <button className="btn-primary w-full text-lg" onClick={onRematch}>
          Реванш
        </button>
        <button className="btn-secondary w-full" onClick={onLeaveLobby}>
          В лобби
        </button>
      </motion.div>
    </div>
  );
}
