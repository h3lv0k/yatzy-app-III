import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ProfileData } from '../types/game';

interface ProfileProps {
  profile: ProfileData | null;
  loading: boolean;
  error: string | null;
  onFetchProfile: () => void;
  onBack: () => void;
}

export function Profile({ profile, loading, error, onFetchProfile, onBack }: ProfileProps) {
  useEffect(() => {
    onFetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="gradient-bg flex items-center justify-center min-h-screen">
        <div className="text-white/40 text-lg">Загрузка профиля...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="gradient-bg flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-4xl mb-4">😕</div>
        <p className="text-white/60 mb-4">{error || 'Профиль не найден'}</p>
        <button className="btn-secondary" onClick={onBack}>← Назад</button>
      </div>
    );
  }

  const losses = profile.total_games - profile.wins;

  return (
    <div className="gradient-bg min-h-screen px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-white/50 hover:text-white transition-colors"
        >
          ← Назад
        </button>
        <h1 className="text-xl font-bold text-accent">Профиль</h1>
      </div>

      {/* Avatar & Name */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-6"
      >
        <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center text-3xl mb-3 border-2 border-accent/40">
          {profile.photo_url ? (
            <img
              src={profile.photo_url}
              alt={profile.first_name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            '👤'
          )}
        </div>
        <h2 className="text-xl font-bold text-white">
          {profile.first_name}
          {profile.last_name ? ` ${profile.last_name}` : ''}
        </h2>
        {profile.username && (
          <p className="text-white/40 text-sm">@{profile.username}</p>
        )}
        {profile.rank && (
          <div className="mt-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30">
            <span className="text-accent text-sm font-medium">🏅 Ранг #{profile.rank}</span>
          </div>
        )}
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3 mb-6"
      >
        <StatCard icon="🎮" label="Всего игр" value={profile.total_games} />
        <StatCard icon="🏆" label="Побед" value={profile.wins} highlight />
        <StatCard icon="😞" label="Поражений" value={losses} />
        <StatCard icon="📊" label="% побед" value={`${profile.win_rate}%`} />
        <StatCard icon="⭐" label="Лучший счёт" value={profile.best_score} highlight />
        <StatCard icon="📈" label="Средний счёт" value={profile.avg_score} />
        <StatCard icon="🎲" label="Yatzy" value={profile.total_yatzy_count} />
        <StatCard icon="🎁" label="Бонус верхней" value={profile.total_upper_bonus_count} />
      </motion.div>

      {/* Recent Games */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">
          Последние игры
        </h3>
        {profile.recent_games.length === 0 ? (
          <div className="card text-center text-white/40 py-6">
            <div className="text-2xl mb-2">🎲</div>
            <p className="text-sm">Ещё нет сыгранных партий</p>
          </div>
        ) : (
          <div className="space-y-2">
            {profile.recent_games.map((game, i) => (
              <motion.div
                key={game.game_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                className={`card flex items-center justify-between ${
                  game.placement === 1 ? 'border-green-500/20' : 'border-red-500/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    game.placement === 1
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {game.placement === 1 ? '🏆' : '🥈'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {game.placement === 1 ? 'Победа' : 'Поражение'}
                    </p>
                    <p className="text-[10px] text-white/40">
                      Верх: {game.upper_section_score}/63
                      {game.upper_bonus && (
                        <span className="text-accent ml-1">+35 бонус</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className={`text-lg font-bold font-mono ${
                  game.placement === 1 ? 'text-green-400' : 'text-white/50'
                }`}>
                  {game.total_score}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Member Since */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-white/20 text-xs mt-6"
      >
        Участник с {new Date(profile.created_at).toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </motion.p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: string;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="card flex flex-col items-center py-3">
      <span className="text-lg mb-1">{icon}</span>
      <span className={`text-xl font-bold font-mono ${highlight ? 'text-accent' : 'text-white'}`}>
        {value}
      </span>
      <span className="text-[10px] text-white/40 mt-1">{label}</span>
    </div>
  );
}
