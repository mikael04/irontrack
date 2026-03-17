import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { WorkoutRaw, WorkoutProgress, WorkoutAnnotations, WorkoutRPEValues, WorkoutLoadValues, WorkoutLoadUnits } from '../types';
import { ExerciseCard } from './ExerciseCard';
import { Settings, Trophy, CheckCircle, Download, Upload, X, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DashboardProps {
  workouts: WorkoutRaw[];
  progress: WorkoutProgress;
  annotations: WorkoutAnnotations;
  rpeValues: WorkoutRPEValues;
  loadValues: WorkoutLoadValues;
  loadUnits: WorkoutLoadUnits;
  completionOrder: string[];
  onToggleSet: (workoutId: string, setIndex: number, totalSets: number) => void;
  onUpdateAnnotation: (workoutId: string, annotation: string) => void;
  onUpdateRpeValue: (workoutId: string, rpeValue: string) => void;
  onUpdateLoadValue: (workoutId: string, loadValue: string) => void;
  onUpdateLoadUnit: (workoutId: string, loadUnit: string) => void;
  onReset: () => void;
  onExport: () => Promise<string>;
  initialSelection: { week: number | null; day: string | null };
  onSaveSelection: (week: number, day: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  workouts,
  progress,
  annotations,
  rpeValues,
  loadValues,
  loadUnits,
  completionOrder,
  onToggleSet,
  onUpdateAnnotation,
  onUpdateRpeValue,
  onUpdateLoadValue,
  onUpdateLoadUnit,
  onReset,
  onExport,
  initialSelection,
  onSaveSelection
}) => {

  const [activeTimerWorkoutId, setActiveTimerWorkoutId] = useState<string | null>(null);
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'pt-br' : 'en';
    i18n.changeLanguage(newLang);
  };

  const baseWeeks = useMemo(() => {
    const w = Array.from(new Set(workouts.map(w => w.week))).sort((a: number, b: number) => a - b);
    return w;
  }, [workouts]);

  const workoutDoneMap = useMemo(() => {
    const doneMap = new Map<string, boolean>();

    workouts.forEach((workout) => {
      const workoutProgress = progress[workout.id] || [];
      const isDone = workoutProgress.length >= workout.total_sets && workoutProgress.every(Boolean);
      doneMap.set(workout.id, isDone);
    });

    return doneMap;
  }, [workouts, progress]);

  const weekCompletion = useMemo(() => {
    const completionByWeek: Record<number, boolean> = {};

    baseWeeks.forEach((week) => {
      const workoutsInWeek = workouts.filter((workout) => workout.week === week);
      completionByWeek[week] =
        workoutsInWeek.length > 0 &&
        workoutsInWeek.every((workout) => workoutDoneMap.get(workout.id) === true);
    });

    return completionByWeek;
  }, [baseWeeks, workouts, workoutDoneMap]);

  const weeks = useMemo(() => {
    const pendingWeeks = baseWeeks.filter((week) => !weekCompletion[week]);
    const completedWeeks = baseWeeks.filter((week) => weekCompletion[week]);
    return [...pendingWeeks, ...completedWeeks];
  }, [baseWeeks, weekCompletion]);

  const firstWeek = baseWeeks[0] || 1;
  const firstDays = useMemo(() => {
    return Array.from(new Set(
      workouts
        .filter(w => w.week === firstWeek)
        .map(w => w.day)
    )).sort();
  }, [workouts, firstWeek]);
  const firstDay = firstDays[0] || 'A';

  const [selectedWeek, setSelectedWeek] = useState<number>(
    initialSelection.week && baseWeeks.includes(initialSelection.week) ? initialSelection.week : firstWeek
  );
  const [selectedDay, setSelectedDay] = useState<string>(initialSelection.day || firstDay);

  const isInitializing = useRef(true);
  const lastSavedSelection = useRef<{ week: number; day: string } | null>(null);
  const completionTransitionRef = useRef<{ week: number; day: string; dayDone: boolean; weekDone: boolean } | null>(null);

  const baseDays = useMemo(() => {
    return Array.from(new Set(
      workouts
        .filter(w => w.week === selectedWeek)
        .map(w => w.day)
    )).sort();
  }, [workouts, selectedWeek]);

  const dayCompletion = useMemo(() => {
    const completionByDay: Record<string, boolean> = {};

    baseDays.forEach((day) => {
      const workoutsInDay = workouts.filter(
        (workout) => workout.week === selectedWeek && workout.day === day
      );
      completionByDay[day] =
        workoutsInDay.length > 0 &&
        workoutsInDay.every((workout) => workoutDoneMap.get(workout.id) === true);
    });

    return completionByDay;
  }, [baseDays, workouts, selectedWeek, workoutDoneMap]);

  const days = useMemo(() => {
    const pendingDays = baseDays.filter((day) => !dayCompletion[day]);
    const completedDays = baseDays.filter((day) => dayCompletion[day]);
    return [...pendingDays, ...completedDays];
  }, [baseDays, dayCompletion]);

  const handleWeekSelect = useCallback((week: number) => {
    setSelectedWeek((previousWeek) => {
      if (previousWeek === week) {
        return previousWeek;
      }

      const daysInWeek = Array.from(
        new Set(
          workouts
            .filter((workout) => workout.week === week)
            .map((workout) => workout.day)
        )
      ).sort();

      setSelectedDay(daysInWeek[0] || 'A');
      return week;
    });
  }, [workouts]);

  useEffect(() => {
    if (isInitializing.current) {
      if (initialSelection.week && initialSelection.day) {
        const validWeek = baseWeeks.includes(initialSelection.week) ? initialSelection.week : firstWeek;
        const daysInWeek = Array.from(new Set(
          workouts
            .filter(w => w.week === validWeek)
            .map(w => w.day)
        )).sort();
        const validDay = daysInWeek.includes(initialSelection.day) ? initialSelection.day : daysInWeek[0];

        setSelectedWeek(validWeek);
        setSelectedDay(validDay || 'A');
        lastSavedSelection.current = { week: validWeek, day: validDay || 'A' };
      } else {
        lastSavedSelection.current = { week: firstWeek, day: firstDay };
      }
      isInitializing.current = false;
    }
  }, [initialSelection, baseWeeks, firstWeek, workouts, firstDay]);

  useEffect(() => {
    if (!isInitializing.current && lastSavedSelection.current) {
      if (selectedWeek !== lastSavedSelection.current.week || selectedDay !== lastSavedSelection.current.day) {
        onSaveSelection(selectedWeek, selectedDay);
        lastSavedSelection.current = { week: selectedWeek, day: selectedDay };
      }
    }
  }, [selectedWeek, selectedDay, onSaveSelection]);

  useEffect(() => {
    if (!isInitializing.current) {
      const daysInWeek = Array.from(new Set(
        workouts
          .filter(w => w.week === selectedWeek)
          .map(w => w.day)
      )).sort();

      if (!daysInWeek.includes(selectedDay) && daysInWeek.length > 0) {
        setSelectedDay(daysInWeek[0]);
      }
    }
  }, [selectedWeek, workouts, selectedDay]);

  useEffect(() => {
    if (isInitializing.current) {
      return;
    }

    const dayDone = dayCompletion[selectedDay] === true;
    const weekDone = weekCompletion[selectedWeek] === true;
    const previousState = completionTransitionRef.current;

    if (!previousState || previousState.week !== selectedWeek || previousState.day !== selectedDay) {
      completionTransitionRef.current = { week: selectedWeek, day: selectedDay, dayDone, weekDone };
      return;
    }

    const dayJustCompleted = previousState.dayDone === false && dayDone;
    const weekJustCompleted = previousState.weekDone === false && weekDone;

    if (weekJustCompleted) {
      const currentWeekIndex = baseWeeks.indexOf(selectedWeek);
      const nextWeek = currentWeekIndex >= 0 ? baseWeeks[currentWeekIndex + 1] : undefined;

      if (typeof nextWeek === 'number') {
        completionTransitionRef.current = null;
        handleWeekSelect(nextWeek);
        return;
      }
    }

    if (dayJustCompleted && !weekDone) {
      const currentDayIndex = baseDays.indexOf(selectedDay);
      const nextDay = currentDayIndex >= 0 ? baseDays[currentDayIndex + 1] : undefined;

      if (nextDay) {
        completionTransitionRef.current = null;
        setSelectedDay(nextDay);
        return;
      }
    }

    completionTransitionRef.current = { week: selectedWeek, day: selectedDay, dayDone, weekDone };
  }, [
    selectedWeek,
    selectedDay,
    baseWeeks,
    baseDays,
    dayCompletion,
    weekCompletion,
    handleWeekSelect
  ]);

  const currentDayWorkouts = useMemo(() => {
    return workouts.filter(w => w.week === selectedWeek && w.day === selectedDay);
  }, [workouts, selectedWeek, selectedDay]);

  const { activeWorkouts, finishedWorkouts } = useMemo(() => {
    const active: WorkoutRaw[] = [];
    const finished: WorkoutRaw[] = [];

    const orderMap = new Map<string, number>();
    completionOrder.forEach((id, index) => orderMap.set(id, index));

    currentDayWorkouts.forEach(w => {
      const p = progress[w.id] || [];
      const isDone = p.length >= w.total_sets && p.every(Boolean);

      if (isDone) {
        finished.push(w);
      } else {
        active.push(w);
      }
    });

    finished.sort((a, b) => {
      const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : -1;
      const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : -1;
      return orderB - orderA;
    });

    return { activeWorkouts: active, finishedWorkouts: finished };
  }, [currentDayWorkouts, progress, completionOrder]);

  const handleSetToggle = (workoutId: string, setIndex: number, totalSets: number) => {
    onToggleSet(workoutId, setIndex, totalSets);

    // Check if the set we just toggled is becoming checked or unchecked
    // In Dashbard's logic, toggleSet simply inverts the boolean
    // The current progress we have in the render cycle is before the toggle, so we deduce:
    const currentProgress = progress[workoutId] || [];
    const isCurrentlyChecked = currentProgress[setIndex] === true;

    if (!isCurrentlyChecked) {
      // It's being checked, meaning a rest period is starting
      const start = Date.now();
      setTimerStartTime(start);
      setActiveTimerWorkoutId(workoutId);

      const workout = currentDayWorkouts.find(w => w.id === workoutId);
      if (workout) {
        const completedCount = currentProgress.filter(Boolean).length;
        // Since we are checking now, we are in the rest period after completing `completedCount + 1` sets
        const currentSeries = completedCount + 1;

        import('../utils/notification').then(({ NotificationTimer }) => {
          NotificationTimer.start({
            title: `IronTrack - ${t('exercise_notification')}: ${workout.exercise} ${currentSeries}/${workout.total_sets}`,
            startTime: start
          }).catch(e => console.error("Notification Plugin Error:", e));
        });
      }
    } else {
      // A set was unchecked, or we can just stop the timer if it belonged to this exact one
      if (activeTimerWorkoutId === workoutId) {
        setTimerStartTime(null);
        setActiveTimerWorkoutId(null);
        import('../utils/notification').then(({ NotificationTimer }) => {
          NotificationTimer.stop();
        });
      }
    }
  };

  const progressStats = useMemo(() => {
    let totalSets = 0;
    let completedSets = 0;

    currentDayWorkouts.forEach(w => {
      totalSets += w.total_sets;
      const p = progress[w.id] || [];
      completedSets += p.filter(Boolean).length;
    });

    return { total: totalSets, completed: completedSets };
  }, [currentDayWorkouts, progress]);

  const progressPercentage = progressStats.total === 0 ? 0 : Math.round((progressStats.completed / progressStats.total) * 100);

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-30 bg-gym-900/95 backdrop-blur-md border-b border-gym-800 shadow-xl">
        <div className="max-w-3xl mx-auto px-4 py-3">

          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <div className="bg-gym-accent p-1.5 rounded-lg">
                <Trophy size={18} className="text-white" />
              </div>
              <h1 className="text-lg font-bold text-white">IronTrack</h1>
            </div>
            <button
              onClick={() => setShowSettingsMenu(true)}
              className="text-xs text-gym-500 hover:text-white flex items-center space-x-1"
            >
              <Settings size={14} />
              <span>{t('settings')}</span>
            </button>
          </div>

          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
              {weeks.map(week => (
                <button
                  key={week}
                  onClick={() => handleWeekSelect(week)}
                  className={`
                            whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all
                            ${selectedWeek === week
                      ? 'bg-white text-gym-900 shadow-md'
                      : weekCompletion[week]
                        ? 'bg-gym-800 text-gym-500 hover:bg-gym-700'
                        : 'bg-gym-800 text-gym-400 hover:bg-gym-700'
                    }
                        `}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span>{t('week')} {week}</span>
                    {weekCompletion[week] && <CheckCircle size={12} />}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex border-b border-gym-700">
              {days.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`
                            px-6 py-2 text-sm font-semibold border-b-2 transition-colors
                            ${selectedDay === day
                      ? 'border-gym-accent text-gym-accent'
                      : dayCompletion[day]
                        ? 'border-transparent text-gym-600 hover:text-gym-400'
                        : 'border-transparent text-gym-500 hover:text-gym-300'
                    }
                        `}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span>{t('day')} {day}</span>
                    {dayCompletion[day] && <CheckCircle size={12} />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-1 w-full bg-gym-800">
          <div
            className="h-full bg-gym-accent transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">

        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {t('day')} {selectedDay}
            </h2>
            <p className="text-gym-400 text-sm">
              {currentDayWorkouts.length > 0 ? currentDayWorkouts[0].focus : t('rest_day')}
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-white">{progressPercentage}%</span>
            <p className="text-xs text-gym-500 uppercase tracking-wide">{t('daily_goal')}</p>
          </div>
        </div>

        <div className="space-y-4">
          {activeWorkouts.length === 0 && finishedWorkouts.length === 0 && (
            <div className="text-center py-20 bg-gym-800/50 rounded-xl border border-dashed border-gym-700">
              <p className="text-gym-500">{t('no_exercises_found')}</p>
            </div>
          )}

          {activeWorkouts.map(workout => (
            <ExerciseCard
              key={workout.id}
              workout={workout}
              completedSets={progress[workout.id] || []}
              onToggleSet={(setIndex) => handleSetToggle(workout.id, setIndex, workout.total_sets)}
              showTimer={activeTimerWorkoutId === workout.id}
              timerStartTime={timerStartTime}
              isFinished={false}
              annotation={annotations[workout.id] || ''}
              onAnnotationChange={(annotation) => onUpdateAnnotation(workout.id, annotation)}
              rpeValue={rpeValues[workout.id] ?? workout.rpe}
              onRpeValueChange={(rpeValue) => onUpdateRpeValue(workout.id, rpeValue)}
              loadValue={loadValues[workout.id]}
              loadUnit={loadUnits[workout.id] ?? workout.load_unit}
              onLoadValueChange={(loadValue) => onUpdateLoadValue(workout.id, loadValue)}
              onLoadUnitChange={(loadUnit) => onUpdateLoadUnit(workout.id, loadUnit)}
            />
          ))}

          {finishedWorkouts.length > 0 && (
            <div className="pt-8 pb-4">
              <div className="flex items-center space-x-3 text-gym-500 mb-4">
                <CheckCircle size={20} />
                <h3 className="font-bold text-sm uppercase tracking-wider">{t('completed_exercises')}</h3>
                <div className="h-px bg-gym-800 flex-grow"></div>
              </div>

              <div className="space-y-4">
                {finishedWorkouts.map(workout => (
                  <ExerciseCard
                    key={workout.id}
                    workout={workout}
                    completedSets={progress[workout.id] || []}
                    onToggleSet={(setIndex) => handleSetToggle(workout.id, setIndex, workout.total_sets)}
                    showTimer={activeTimerWorkoutId === workout.id}
                    timerStartTime={timerStartTime}
                    isFinished={true}
                    annotation={annotations[workout.id] || ''}
                    onAnnotationChange={(annotation) => onUpdateAnnotation(workout.id, annotation)}
                    rpeValue={rpeValues[workout.id] ?? workout.rpe}
                    onRpeValueChange={(rpeValue) => onUpdateRpeValue(workout.id, rpeValue)}
                    loadValue={loadValues[workout.id]}
                    loadUnit={loadUnits[workout.id] ?? workout.load_unit}
                    onLoadValueChange={(loadValue) => onUpdateLoadValue(workout.id, loadValue)}
                    onLoadUnitChange={(loadUnit) => onUpdateLoadUnit(workout.id, loadUnit)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Settings Menu Modal */}
      {showSettingsMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gym-900 border border-gym-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gym-800 flex justify-between items-center">
              <h3 className="font-bold text-white">{t('settings')}</h3>
              <button
                onClick={() => setShowSettingsMenu(false)}
                className="text-gym-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={toggleLanguage}
                className="w-full p-4 rounded-xl border border-gym-700 hover:border-gym-accent hover:bg-gym-accent/5 transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-gym-800 p-2 rounded-lg group-hover:bg-gym-accent/20 transition-colors">
                    <Globe size={18} className="text-gym-400 group-hover:text-gym-accent" />
                  </div>
                  <div className="font-semibold text-white">{t('language')}</div>
                </div>
                <div className="bg-gym-800 px-3 py-1 rounded-md text-sm font-bold text-gym-400 group-hover:text-gym-accent uppercase transition-colors">
                  {i18n.language}
                </div>
              </button>

              <button
                onClick={async () => {
                  setShowSettingsMenu(false);
                  try {
                    const filePath = await onExport();
                    alert(t('export_success', { filePath }));
                  } catch (error: any) {
                    console.error('Export error:', error);
                    alert(t('export_failed', { error: error?.message || 'Unknown error' }));
                  }
                }}
                className="w-full p-4 rounded-xl border border-gym-700 hover:border-gym-accent hover:bg-gym-accent/5 transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-gym-800 p-2 rounded-lg group-hover:bg-gym-accent/20 transition-colors">
                    <Download size={18} className="text-gym-400 group-hover:text-gym-accent" />
                  </div>
                  <div>
                    <div className="font-semibold text-white mb-1">{t('export_training')}</div>
                    <div className="text-xs text-gym-500">
                      {t('export_training_desc')}
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowSettingsMenu(false);
                  if (confirm(t('confirm_import'))) {
                    onReset();
                  }
                }}
                className="w-full p-4 rounded-xl border border-gym-700 hover:border-gym-accent hover:bg-gym-accent/5 transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-gym-800 p-2 rounded-lg group-hover:bg-gym-accent/20 transition-colors">
                    <Upload size={18} className="text-gym-400 group-hover:text-gym-accent" />
                  </div>
                  <div>
                    <div className="font-semibold text-white mb-1">{t('import_new_training')}</div>
                    <div className="text-xs text-gym-500">
                      {t('import_new_training_desc')}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
