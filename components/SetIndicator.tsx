import React from 'react';
import { Check } from 'lucide-react';

interface SetIndicatorProps {
  index: number;
  isCompleted: boolean;
  onToggle: () => void;
}

export const SetIndicator: React.FC<SetIndicatorProps> = ({ index, isCompleted, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`
        relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ease-in-out
        ${isCompleted 
          ? 'bg-gym-accent border-gym-accent text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]' 
          : 'bg-transparent border-gym-600 text-gym-600 hover:border-gym-500 hover:text-gym-500'
        }
      `}
      aria-label={`Mark set ${index + 1} as ${isCompleted ? 'incomplete' : 'complete'}`}
    >
      {isCompleted ? (
        <Check size={20} strokeWidth={3} />
      ) : (
        <span className="text-sm font-medium">{index + 1}</span>
      )}
    </button>
  );
};
