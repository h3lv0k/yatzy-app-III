import { useState } from 'react';
import { motion } from 'framer-motion';

const AVATAR_EMOJIS = [
  '🎲', '🎯', '🏆', '⭐', '🔥', '💎',
  '🐶', '🐱', '🐼', '🦊', '🐸', '🦄',
  '🐻', '🐯', '🦁', '🐨', '🐰', '🐷',
  '👾', '🤖', '👻', '🎃', '💀', '🧙',
  '🚀', '⚡', '🌈', '🍀', '🎵', '🎮',
];

interface ProfileEditProps {
  displayName: string;
  avatarEmoji: string;
  onSave: (displayName: string, avatarEmoji: string) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

export function ProfileEdit({
  displayName,
  avatarEmoji,
  onSave,
  onCancel,
  saving,
}: ProfileEditProps) {
  const [newName, setNewName] = useState(displayName);
  const [newEmoji, setNewEmoji] = useState(avatarEmoji || '🎲');
  const [error, setError] = useState('');

  const handleSave = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('Ник не может быть пустым');
      return;
    }
    if (trimmed.length > 20) {
      setError('Ник не длиннее 20 символов');
      return;
    }
    try {
      setError('');
      await onSave(trimmed, newEmoji);
    } catch {
      setError('Ошибка при сохранении');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-[#1a1a2e] border-t border-white/10 rounded-t-2xl p-5 pb-8"
      >
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        <h2 className="text-lg font-bold text-white mb-5">Редактировать профиль</h2>

        {/* Avatar Selection */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-3">
            Аватар
          </label>
          <div className="grid grid-cols-6 gap-2">
            {AVATAR_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setNewEmoji(emoji)}
                className={`w-full aspect-square text-2xl rounded-xl transition-all ${
                  newEmoji === emoji
                    ? 'bg-accent/20 scale-110 ring-2 ring-accent'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Display Name Input */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
            Игровой ник
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Введите ник"
            maxLength={20}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                       text-white placeholder:text-white/20
                       focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30
                       transition-all"
          />
          <p className="text-[10px] text-white/30 mt-1 text-right">{newName.length}/20</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 btn-secondary disabled:opacity-50"
          >
            Отменить
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 btn-primary disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
