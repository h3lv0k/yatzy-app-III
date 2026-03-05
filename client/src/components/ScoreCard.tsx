import { motion } from 'framer-motion';
import {
  ScoreCategory, UPPER_CATEGORIES, LOWER_CATEGORIES,
  CATEGORY_NAMES, CATEGORY_ICONS, GameScore, LobbyPlayer
} from '../types/game';
import { calculateScore, computeUpperTotal, computeTotalScore } from '../utils/yatzy';

interface ScoreCardProps {
  players: LobbyPlayer[];
  scores: GameScore[];
  dice: number[];
  currentPlayerId: number;
  myId: number;
  canScore: boolean;
  onScore: (category: ScoreCategory) => void;
}

export function ScoreCard({ players, scores, dice, currentPlayerId, myId, canScore, onScore }: ScoreCardProps) {
  const isMyTurn = currentPlayerId === myId;
  const hasDice = dice.some((d) => d > 0);

  // Build score maps per player
  const playerScores: Record<number, Record<string, number>> = {};
  players.forEach((p) => {
    const map: Record<string, number> = {};
    scores
      .filter((s) => s.player_id === p.player_id)
      .forEach((s) => { map[s.category] = s.value; });
    playerScores[p.player_id] = map;
  });

  const renderCategoryRow = (cat: ScoreCategory) => {
    const myScores = playerScores[myId] || {};
    const isUsed = myScores[cat] !== undefined;
    const previewScore = hasDice ? calculateScore(cat, dice) : 0;
    const canClick = canScore && isMyTurn && !isUsed && hasDice;

    return (
      <tr key={cat} className="border-b border-white/5">
        <td className="py-2 px-2 text-xs text-white/60">
          <span className="mr-1">{CATEGORY_ICONS[cat]}</span>
          {CATEGORY_NAMES[cat]}
        </td>
        {players.map((p) => {
          const pScores = playerScores[p.player_id] || {};
          const scored = pScores[cat];
          const isMe = p.player_id === myId;
          const showPreview = isMe && canClick;

          return (
            <td
              key={p.player_id}
              className={`py-2 px-2 text-center text-sm font-mono relative
                ${showPreview
                  ? 'cursor-pointer bg-accent/10 hover:bg-accent/20 transition-colors'
                  : ''
                }
                ${p.player_id === currentPlayerId ? 'bg-white/[0.03]' : ''}
              `}
              onClick={showPreview ? () => onScore(cat) : undefined}
            >
              {scored !== undefined ? (
                <span className={scored === 0 ? 'text-white/20' : 'text-green-400'}>
                  {scored}
                </span>
              ) : showPreview ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-accent font-bold"
                >
                  {previewScore}
                </motion.span>
              ) : (
                <span className="text-white/10">—</span>
              )}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="py-2 px-2 text-left text-xs text-white/40 font-normal w-[40%]">
              Категория
            </th>
            {players.map((p) => (
              <th key={p.player_id} className="py-2 px-2 text-center text-xs font-medium w-[30%]">
                <div className={`${p.player_id === myId ? 'text-accent' : 'text-white/70'}`}>
                  {p.players?.first_name?.slice(0, 8) || 'Игрок'}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Upper section header */}
          <tr className="bg-white/[0.03]">
            <td colSpan={3} className="py-1 px-2 text-[10px] text-white/30 uppercase tracking-wider">
              Верхняя секция
            </td>
          </tr>
          {UPPER_CATEGORIES.map(renderCategoryRow)}

          {/* Upper bonus row */}
          <tr className="border-b border-white/10 bg-white/[0.03]">
            <td className="py-2 px-2 text-xs text-white/40">
              Бонус (сумма ≥ 63)
            </td>
            {players.map((p) => {
              const pScores = playerScores[p.player_id] || {};
              const upperTotal = computeUpperTotal(pScores);
              const hasBonus = upperTotal >= 63;
              return (
                <td key={p.player_id} className="py-2 px-2 text-center text-xs font-mono">
                  <span className={hasBonus ? 'text-accent font-bold' : 'text-white/30'}>
                    {upperTotal}/63 {hasBonus && '+35'}
                  </span>
                </td>
              );
            })}
          </tr>

          {/* Lower section header */}
          <tr className="bg-white/[0.03]">
            <td colSpan={3} className="py-1 px-2 text-[10px] text-white/30 uppercase tracking-wider">
              Нижняя секция
            </td>
          </tr>
          {LOWER_CATEGORIES.map(renderCategoryRow)}

          {/* Total row */}
          <tr className="border-t border-accent/30 bg-accent/5">
            <td className="py-3 px-2 text-sm font-bold text-accent">
              ИТОГО
            </td>
            {players.map((p) => {
              const pScores = playerScores[p.player_id] || {};
              const total = computeTotalScore(pScores);
              return (
                <td key={p.player_id} className="py-3 px-2 text-center text-lg font-bold font-mono text-accent">
                  {total}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
