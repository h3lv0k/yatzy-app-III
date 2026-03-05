import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LeaderboardEntry } from '../types/game';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface LeaderboardProps {
  onBack: () => void;
}

export function Leaderboard({ onBack }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/leaderboard`)
      .then((r) => r.json())
      .then((data) => setEntries(data))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="gradient-bg min-h-screen px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-white/50 hover:text-white transition-colors"
        >
          ← Назад
        </button>
        <h1 className="text-xl font-bold text-accent">Таблица лидеров</h1>
      </div>

      {loading ? (
        <div className="text-center text-white/40 py-12">
          Загрузка...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center text-white/40 py-12">
          <div className="text-4xl mb-3">🏆</div>
          <p>Пока нет данных</p>
          <p className="text-xs mt-1">Сыграйте первую партию!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`card flex items-center justify-between ${
                i < 3 ? 'border-accent/20' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  i === 1 ? 'bg-gray-400/20 text-gray-300' :
                  i === 2 ? 'bg-amber-700/20 text-amber-600' :
                  'bg-white/5 text-white/40'
                }`}>
                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : entry.rank}
                </div>
                <div>
                  <p className="font-medium text-sm text-white">
                    {entry.first_name}
                    {entry.username && (
                      <span className="text-white/30 ml-1 text-xs">@{entry.username}</span>
                    )}
                  </p>
                  <p className="text-[10px] text-white/40">
                    {entry.total_games} игр | {entry.win_rate}% побед
                    {entry.total_yatzy_count > 0 && ` | ${entry.total_yatzy_count} Yatzy`}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-bold text-accent">{entry.wins} W</div>
                <div className="text-[10px] text-white/40">Лучший: {entry.best_score}</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
