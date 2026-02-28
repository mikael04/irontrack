import React, { useMemo, useState } from 'react';
import { WorkoutRaw } from '../types';
import { SetIndicator } from './SetIndicator';
import { RestTimer } from './RestTimer';
import { Dumbbell, Clock, Activity, BarChart2, CheckCircle2, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ExerciseCardProps {
  workout: WorkoutRaw;
  completedSets: boolean[];
  onToggleSet: (setIndex: number) => void;
  showTimer: boolean;
  timerStartTime: number | null;
  isFinished: boolean;
  annotation: string;
  onAnnotationChange: (annotation: string) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  workout,
  completedSets,
  onToggleSet,
  showTimer,
  timerStartTime,
  isFinished,
  annotation,
  onAnnotationChange
}) => {
  const { t } = useTranslation();

  // Ensure we have a boolean for every set, defaulting to false
  const setsState = useMemo(() => {
    const states = [...completedSets];
    while (states.length < workout.total_sets) {
      states.push(false);
    }
    return states;
  }, [completedSets, workout.total_sets]);

  return (
    <div className={`
      rounded-xl p-5 shadow-lg border mb-4 transition-all duration-300
      ${isFinished
        ? 'bg-gym-900/40 border-gym-800 opacity-75 grayscale-[0.3]'
        : 'bg-gym-800 border-gym-700 hover:scale-[1.01]'
      }
    `}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className={`text-xl font-bold tracking-tight leading-tight ${isFinished ? 'text-gym-400 line-through' : 'text-white'}`}>
            {workout.exercise}
          </h3>
          <p className="text-gym-accent text-sm font-semibold uppercase tracking-wider mt-1">
            {workout.focus}
          </p>
        </div>
        {isFinished && (
          <div className="text-gym-600">
            <CheckCircle2 size={24} />
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 my-4 p-3 bg-gym-900/50 rounded-lg border border-gym-700/50">
        <div className="flex items-center space-x-2 text-gym-300">
          <div className="p-1.5 bg-gym-800 rounded text-gym-accent">
            <Dumbbell size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gym-500 uppercase">{t('load')}</span>
            <span className="font-mono font-medium text-sm text-white">{workout.load_kg} <span className="text-xs text-gym-500">({workout.load_pct})</span></span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-gym-300">
          <div className="p-1.5 bg-gym-800 rounded text-amber-500">
            <Activity size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gym-500 uppercase">{t('rpe')}</span>
            <span className="font-mono font-medium text-sm text-white">{workout.rpe}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-gym-300">
          <div className="p-1.5 bg-gym-800 rounded text-blue-500">
            <BarChart2 size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gym-500 uppercase">{t('reps')}</span>
            <span className="font-mono font-medium text-sm text-white">{workout.reps}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-gym-300">
          <div className="p-1.5 bg-gym-800 rounded text-purple-500">
            <Clock size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gym-500 uppercase">{t('rest')}</span>
            <span className="font-mono font-medium text-sm text-white">{workout.rest}</span>
          </div>
        </div>
      </div>

      {/* Set Tracking */}
      <div className="mt-4 pt-4 border-t border-gym-700">
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-xs font-semibold text-gym-500 uppercase mr-2">{t('sets')}</span>
          {Array.from({ length: workout.total_sets }).map((_, idx) => (
            <SetIndicator
              key={idx}
              index={idx}
              isCompleted={setsState[idx]}
              onToggle={() => onToggleSet(idx)}
            />
          ))}

          {/* Timer Display */}
          {showTimer && timerStartTime && !isFinished && (
            <div className="ml-auto">
              <RestTimer startTime={timerStartTime} />
            </div>
          )}
        </div>
      </div>

      {/* Annotation Input */}
      <div className="mt-4 pt-4 border-t border-gym-700">
        <div className="flex items-start space-x-2">
          <div className="p-1.5 bg-gym-800 rounded text-gym-accent mt-1">
            <MessageSquare size={14} />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-gym-500 uppercase block mb-2">
              {t('annotation')}
            </label>
            <textarea
              value={annotation}
              onChange={(e) => onAnnotationChange(e.target.value)}
              placeholder="..."
              className="w-full bg-gym-900/50 border border-gym-700/50 rounded-lg p-3 text-sm text-white placeholder-gym-600 focus:outline-none focus:ring-2 focus:ring-gym-accent focus:border-transparent resize-none transition-all"
              rows={2}
              disabled={isFinished}
            />
          </div>
        </div>
      </div>
    </div>
  );
};