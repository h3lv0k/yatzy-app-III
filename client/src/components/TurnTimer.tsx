import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface TurnTimerProps {
  turnStartedAt: string;
  timeLimit: number;
  isMyTurn: boolean;
}

export function TurnTimer({ turnStartedAt, timeLimit, isMyTurn }: TurnTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(timeLimit);

  useEffect(() => {
    const startTime = new Date(turnStartedAt).getTime();

    const update = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, timeLimit - elapsed);
      setSecondsLeft(remaining);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [turnStartedAt, timeLimit]);

  const progress = secondsLeft / timeLimit;
  const isLow = secondsLeft <= 10;
  const isCritical = secondsLeft <= 5;

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-10 h-10">
        <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="3"
          />
          <motion.circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke={isCritical ? '#ef4444' : isLow ? '#f59e0b' : '#22c55e'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
          isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-white/70'
        }`}>
          {secondsLeft}
        </span>
      </div>
      <span className={`text-xs ${isMyTurn ? 'text-accent' : 'text-white/40'}`}>
        {isMyTurn ? 'Ваш ход' : 'Ход соперника'}
      </span>
    </div>
  );
}
