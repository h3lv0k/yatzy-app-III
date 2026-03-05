import { motion } from 'framer-motion';

interface DieProps {
  value: number;
  held: boolean;
  canHold: boolean;
  onToggle: () => void;
  rolling?: boolean;
}

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

export function Die({ value, held, canHold, onToggle, rolling }: DieProps) {
  const dots = DOT_POSITIONS[value] || [];

  return (
    <motion.button
      onClick={canHold ? onToggle : undefined}
      animate={rolling ? {
        rotate: [0, 180, 360],
        scale: [1, 0.8, 1],
      } : {}}
      transition={rolling ? { duration: 0.4, ease: 'easeOut' } : {}}
      className={`
        relative w-14 h-14 rounded-xl flex items-center justify-center
        transition-all duration-150
        ${held
          ? 'bg-gradient-to-br from-accent to-accent-dim shadow-lg shadow-accent/30 ring-2 ring-accent/50'
          : value > 0
            ? 'bg-white/10 hover:bg-white/15'
            : 'bg-white/5'
        }
        ${canHold ? 'cursor-pointer active:scale-90' : 'cursor-default'}
        ${!canHold && !held ? 'opacity-60' : ''}
      `}
      title={held ? 'Разморозить' : canHold ? 'Заморозить' : ''}
    >
      {value > 0 ? (
        <svg viewBox="0 0 100 100" className="w-10 h-10">
          {dots.map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={10}
              fill={held ? '#1a1a2e' : '#ffffff'}
              opacity={held ? 1 : 0.9}
            />
          ))}
        </svg>
      ) : (
        <span className="text-white/20 text-xl">?</span>
      )}

      {held && (
        <span className="absolute -top-1 -right-1 text-[10px] bg-accent text-bg rounded-full w-4 h-4 flex items-center justify-center font-bold">
          H
        </span>
      )}
    </motion.button>
  );
}
