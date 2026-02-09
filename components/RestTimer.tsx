import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

interface RestTimerProps {
  startTime: number;
}

export const RestTimer: React.FC<RestTimerProps> = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Immediate update
    setElapsed(Math.floor((Date.now() - startTime) / 1000));

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-gym-900/80 rounded-full border border-gym-accent/30 text-gym-accent animate-in fade-in zoom-in duration-300">
      <Timer size={14} className="animate-pulse" />
      <span className="font-mono font-bold text-sm tracking-widest">{formatTime(elapsed)}</span>
    </div>
  );
};