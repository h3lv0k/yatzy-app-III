import { useState } from 'react';
import { motion } from 'framer-motion';

interface LobbyProps {
  onCreateLobby: () => Promise<void>;
  onJoinLobby: (code: string) => Promise<void>;
  onShowLeaderboard: () => void;
  loading: boolean;
  error: string | null;
  initialCode?: string | null;
}

export function Lobby({ onCreateLobby, onJoinLobby, onShowLeaderboard, loading, error, initialCode }: LobbyProps) {
  const [code, setCode] = useState(initialCode || '');
  const [tab, setTab] = useState<'create' | 'join'>(initialCode ? 'join' : 'create');

  const handleJoin = () => {
    if (code.trim().length >= 4) {
      onJoinLobby(code.trim().toUpperCase());
    }
  };

  return (
    <div className="gradient-bg flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="text-6xl mb-3 animate-bounce-slow">🎲</div>
        <h1 className="text-4xl font-extrabold tracking-wider text-accent">YATZY</h1>
        <p className="text-white/50 text-sm mt-1">Мультиплеер для 2 игроков</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="card w-full max-w-sm"
      >
        {/* Tabs */}
        <div className="flex mb-4 bg-white/5 rounded-lg p-1">
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              tab === 'create'
                ? 'bg-accent text-bg shadow-sm'
                : 'text-white/60 hover:text-white/80'
            }`}
            onClick={() => setTab('create')}
          >
            Создать
          </button>
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              tab === 'join'
                ? 'bg-accent text-bg shadow-sm'
                : 'text-white/60 hover:text-white/80'
            }`}
            onClick={() => setTab('join')}
          >
            Присоединиться
          </button>
        </div>

        {tab === 'create' ? (
          <div className="space-y-4">
            <p className="text-white/60 text-sm text-center">
              Создайте лобби и пригласите друга по коду
            </p>
            <button
              className="btn-primary w-full text-lg"
              onClick={onCreateLobby}
              disabled={loading}
            >
              {loading ? 'Создание...' : 'Создать лобби'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider block mb-2">
                Код лобби
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                placeholder="YATZ42"
                maxLength={8}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center
                           text-2xl tracking-[0.3em] font-mono text-white placeholder:text-white/20
                           focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30
                           transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>
            <button
              className="btn-primary w-full text-lg"
              onClick={handleJoin}
              disabled={loading || code.trim().length < 4}
            >
              {loading ? 'Подключение...' : 'Присоединиться'}
            </button>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm text-center"
          >
            {error}
          </motion.div>
        )}
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 text-white/40 hover:text-accent text-sm transition-colors"
        onClick={onShowLeaderboard}
      >
        Таблица лидеров
      </motion.button>
    </div>
  );
}
