import React, { useMemo } from 'react';
import { WorkoutRaw, OneRmValues } from '../types';
import { SetIndicator } from './SetIndicator';
import { RestTimer } from './RestTimer';
import { Dumbbell, Clock, Activity, BarChart2, CheckCircle2, MessageSquare, ListChecks } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatPrepWithWeights } from '../utils/prepCalculation';

interface ExerciseCardProps {
  workout: WorkoutRaw;
  completedSets: boolean[];
  onToggleSet: (setIndex: number) => void;
  showTimer: boolean;
  timerStartTime: number | null;
  isFinished: boolean;
  annotation: string;
  onAnnotationChange: (annotation: string) => void;
  rpeValue: string;
  onRpeValueChange: (rpeValue: string) => void;
  loadValue?: string;
  loadUnit: string;
  onLoadValueChange: (loadValue: string) => void;
  onLoadUnitChange: (loadUnit: string) => void;
  variant?: 'classic' | 'ontrain';
  oneRmValues?: OneRmValues;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  workout,
  completedSets,
  onToggleSet,
  showTimer,
  timerStartTime,
  isFinished,
  annotation,
  onAnnotationChange,
  rpeValue,
  onRpeValueChange,
  loadValue,
  loadUnit,
  onLoadValueChange,
  onLoadUnitChange,
  variant = 'classic',
  oneRmValues = { squat: '', bench: '', deadlift: '' }
}) => {
  const { t } = useTranslation();
  const isOnTrainVariant = variant === 'ontrain';

  // Ensure we have a boolean for every set, defaulting to false
  const setsState = useMemo(() => {
    const states = [...completedSets];
    while (states.length < workout.total_sets) {
      states.push(false);
    }
    return states;
  }, [completedSets, workout.total_sets]);

  const prepText = workout.prep?.trim() ?? '';
  const normalizedPrep = prepText.toLowerCase();
  const shouldShowPrep = prepText.length > 0 && normalizedPrep !== '-' && normalizedPrep !== 'na' && normalizedPrep !== 'n/a';
  const formattedPrepText = useMemo(() => {
    if (!shouldShowPrep) return prepText;
    return formatPrepWithWeights(prepText, oneRmValues, workout.exercise);
  }, [prepText, shouldShowPrep, oneRmValues, workout.exercise]);
  const normalizeLoadValue = (value: string): string => {
    const normalized = value.replace(/\./g, ',').replace(/[^0-9,]/g, '');
    const [whole, ...rest] = normalized.split(',');
    let result = whole;
    if (rest.length > 0) {
      result = `${whole},${rest.join('')}`;
    }
    if (result.startsWith(',')) {
      return `0${result}`;
    }
    return result;
  };

  const displayLoadValue = loadValue ?? normalizeLoadValue(workout.load_kg);

  return (
    <div className={`
      rounded-xl shadow-lg border transition-all duration-300
      ${isOnTrainVariant ? 'h-full mb-0 overflow-hidden p-3 flex flex-col' : 'mb-4 p-5'}
      ${isFinished
        ? 'bg-gym-900/40 border-gym-800 opacity-75 grayscale-[0.3]'
        : isOnTrainVariant
          ? 'bg-gym-800 border-gym-700'
          : 'bg-gym-800 border-gym-700 hover:scale-[1.01]'
      }
    `}>
      <div className={`${isOnTrainVariant ? 'mb-1' : 'mb-2'} flex justify-between items-start`}>
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
      <div className={`grid grid-cols-3 bg-gym-900/50 rounded-lg border border-gym-700/50 ${
        isOnTrainVariant ? 'gap-2 my-2 p-2' : 'gap-3 my-4 p-3'
      }`}>
        <div className="col-span-2 flex items-center space-x-2 text-gym-300">
          <div className="p-1.5 bg-gym-800 rounded text-gym-accent">
            <Dumbbell size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gym-500 uppercase">
              {t('load')}
              {workout.load_pct && workout.load_pct !== '-' && (
                <span className="ml-1 text-gym-500">({workout.load_pct})</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <input
                value={displayLoadValue}
                onChange={(e) => onLoadValueChange(e.target.value)}
                onBlur={() => {
                  if (displayLoadValue === '') {
                    onLoadValueChange('0');
                  }
                }}
                inputMode="decimal"
                pattern="[0-9,]*"
                disabled={isFinished}
                className={`font-mono font-medium text-sm text-white bg-gym-800 border border-gym-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gym-accent disabled:opacity-50 ${
                  isOnTrainVariant ? 'w-16' : 'w-20'
                }`}
                aria-label={t('load')}
              />
              <select
                value={loadUnit}
                onChange={(e) => onLoadUnitChange(e.target.value)}
                disabled={isFinished}
                className={`font-mono font-medium text-sm text-white bg-gym-800 border border-gym-700 rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-gym-accent disabled:opacity-50 ${
                  isOnTrainVariant ? 'w-14' : 'w-16'
                }`}
                aria-label={t('load_unit')}
              >
                <option value="kg">{t('load_unit_kg')}</option>
                <option value="bar">{t('load_unit_bars')}</option>
                <option value="dumb">{t('load_unit_dumb')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-gym-300">
          <div className="p-1.5 bg-gym-800 rounded text-amber-500">
            <Activity size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gym-500 uppercase">{t('rpe')}</span>
            <select
              value={rpeValue}
              onChange={(e) => onRpeValueChange(e.target.value)}
              disabled={isFinished}
              className="w-14 font-mono font-medium text-sm text-white bg-gym-800 border border-gym-700 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-gym-accent disabled:opacity-50"
            >
              <option value="-">-</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <option key={num} value={num.toString()}>{num}</option>
              ))}
            </select>
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

        <div className="col-span-2 flex items-center space-x-2 text-gym-300">
          <div className="p-1.5 bg-gym-800 rounded text-purple-500">
            <Clock size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gym-500 uppercase">{t('rest')}</span>
            <span className="font-mono font-medium text-sm text-white">{workout.rest}</span>
          </div>
        </div>

        {shouldShowPrep && (
          <div className="col-span-3 flex items-center space-x-2 text-gym-300">
            <div className="p-1.5 bg-gym-800 rounded text-emerald-500">
              <ListChecks size={14} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gym-500 uppercase">{t('prep')}</span>
              <span className="font-mono font-medium text-sm text-white">{formattedPrepText}</span>
            </div>
          </div>
        )}
      </div>

      {/* Set Tracking */}
      <div className={`${isOnTrainVariant ? 'mt-2 pt-2' : 'mt-4 pt-4'} border-t border-gym-700`}>
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
      <div className={`${isOnTrainVariant ? 'mt-2 pt-2' : 'mt-4 pt-4'} border-t border-gym-700`}>
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
              rows={isOnTrainVariant ? 1 : 2}
              disabled={isFinished}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
