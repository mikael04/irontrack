import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  WorkoutRaw,
  WorkoutProgress,
  WorkoutAnnotations,
  WorkoutRPEValues,
  WorkoutLoadValues,
  WorkoutLoadUnits,
  ViewMode,
  ExerciseHistoryEntry,
  OneRmValues,
  OneRmMovementId,
} from '../types';
import { ExerciseCard } from './ExerciseCard';
import { OneRmSection } from './OneRmSection';
import {
  Settings,
  Trophy,
  CheckCircle,
  Download,
  Upload,
  X,
  Globe,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  ChevronLeft,
  Dumbbell,
  Activity,
  MessageSquare,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DashboardProps {
  workouts: WorkoutRaw[];
  progress: WorkoutProgress;
  annotations: WorkoutAnnotations;
  rpeValues: WorkoutRPEValues;
  loadValues: WorkoutLoadValues;
  loadUnits: WorkoutLoadUnits;
  completionOrder: string[];
  viewMode: ViewMode;
  oneRmValues: OneRmValues;
  onToggleSet: (workoutId: string, setIndex: number, totalSets: number) => void;
  onSetViewMode: (mode: ViewMode) => void;
  onUpdateOneRmValue: (id: OneRmMovementId, value: string) => void;
  onRecordExerciseSnapshot: (input: {
    sourceWorkoutId: string;
    exerciseName: string;
    reps: string;
    completedAt?: string;
    loadValue: string;
    loadUnit: string;
    setsDone: number;
    totalSets: number;
    rpe: string;
    comment: string;
  }) => void;
  onGetLastExerciseSnapshot: (
    exerciseName: string,
    options?: { reps?: string; excludeWorkoutId?: string; beforeDate?: string }
  ) => ExerciseHistoryEntry | null;
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
  viewMode,
  oneRmValues,
  onToggleSet,
  onSetViewMode,
  onUpdateOneRmValue,
  onRecordExerciseSnapshot,
  onGetLastExerciseSnapshot,
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
  const [showOneRm, setShowOneRm] = useState(false);
  const [onTrainIndex, setOnTrainIndex] = useState(0);
  const [onTrainViewportHeight, setOnTrainViewportHeight] = useState(360);

  const headerRef = useRef<HTMLElement | null>(null);
  const onTrainTopRowRef = useRef<HTMLDivElement | null>(null);
  const onTrainHistoryRef = useRef<HTMLDivElement | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const completionSnapshotRef = useRef<Record<string, boolean>>({});

  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'pt-BR' : 'en';
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

  const currentDayWorkouts = useMemo(() => {
    return workouts.filter(w => w.week === selectedWeek && w.day === selectedDay);
  }, [workouts, selectedWeek, selectedDay]);

  const getWorkoutLoadLabel = useCallback((workout: WorkoutRaw) => {
    const loadValue = (loadValues[workout.id] ?? workout.load_kg ?? '-').trim() || '-';
    const loadUnit = loadUnits[workout.id] ?? workout.load_unit;
    const unitLabel =
      loadUnit === 'bar'
        ? t('load_unit_bars')
        : loadUnit === 'dumb'
          ? t('load_unit_dumb')
          : t('load_unit_kg');
    return `${loadValue} ${unitLabel}`;
  }, [loadUnits, loadValues, t]);

  const formatHistoryDate = useCallback((dateIso: string) => {
    const date = new Date(dateIso);
    if (Number.isNaN(date.getTime())) {
      return dateIso;
    }

    return new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }, [i18n.language]);

  const isWorkoutDone = useCallback((workout: WorkoutRaw) => {
    const sets = progress[workout.id] || [];
    return sets.length >= workout.total_sets && sets.every(Boolean);
  }, [progress]);

  const goToOnTrainIndex = useCallback((nextIndex: number, behavior: ScrollBehavior = 'smooth') => {
    if (currentDayWorkouts.length === 0) {
      setOnTrainIndex(0);
      return;
    }

    const maxIndex = currentDayWorkouts.length - 1;
    const safeIndex = Math.max(0, Math.min(nextIndex, maxIndex));
    setOnTrainIndex(safeIndex);

    const viewport = carouselRef.current;
    if (viewport) {
      viewport.scrollTo({
        left: safeIndex * viewport.clientWidth,
        behavior,
      });
    }
  }, [currentDayWorkouts.length]);

  const handleCarouselScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const viewport = event.currentTarget;
    if (viewport.clientWidth <= 0) return;

    const currentIndex = Math.round(viewport.scrollLeft / viewport.clientWidth);
    if (currentIndex !== onTrainIndex) {
      setOnTrainIndex(currentIndex);
    }
  }, [onTrainIndex]);

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

  useEffect(() => {
    setOnTrainIndex(0);
  }, [selectedWeek, selectedDay]);

  useEffect(() => {
    if (onTrainIndex > currentDayWorkouts.length - 1) {
      goToOnTrainIndex(Math.max(0, currentDayWorkouts.length - 1), 'auto');
    }
  }, [currentDayWorkouts.length, goToOnTrainIndex, onTrainIndex]);

  const isOnTrainEnabled = viewMode === 'ontrain';
  const previousViewModeRef = useRef<ViewMode>(viewMode);

  useEffect(() => {
    if (previousViewModeRef.current !== 'ontrain' && isOnTrainEnabled && currentDayWorkouts.length > 0) {
      const firstIncompleteIndex = currentDayWorkouts.findIndex(w => {
        const p = progress[w.id] || [];
        const completedSets = p.filter(Boolean).length;
        return completedSets < w.total_sets;
      });

      if (firstIncompleteIndex !== -1) {
        goToOnTrainIndex(firstIncompleteIndex, 'auto');
      } else {
        goToOnTrainIndex(currentDayWorkouts.length - 1, 'auto');
      }
    }
    previousViewModeRef.current = isOnTrainEnabled ? 'ontrain' : 'classic';
  }, [viewMode, isOnTrainEnabled, currentDayWorkouts, goToOnTrainIndex]);

  useEffect(() => {
    if (isOnTrainEnabled) {
      setShowOneRm(false);
    }
  }, [isOnTrainEnabled]);

  useEffect(() => {
    const updateViewportHeight = () => {
      if (!isOnTrainEnabled || showOneRm) {
        setOnTrainViewportHeight(360);
        return;
      }

      const viewportHeight = window.innerHeight;
      const topRowTop = onTrainTopRowRef.current?.getBoundingClientRect().top ?? 0;
      const topRowHeight = onTrainTopRowRef.current?.offsetHeight ?? 0;
      const historyHeight = onTrainHistoryRef.current?.offsetHeight ?? 0;
      const fallbackHeaderHeight = headerRef.current?.offsetHeight ?? 0;
      const anchorTop = topRowTop > 0 ? topRowTop : fallbackHeaderHeight + 12;
      const availableHeight = Math.max(260, Math.floor(viewportHeight - anchorTop - topRowHeight - historyHeight - 24));
      setOnTrainViewportHeight(availableHeight);
    };

    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
    };
  }, [isOnTrainEnabled, showOneRm, onTrainIndex, currentDayWorkouts.length, annotations]);

  useEffect(() => {
    if (viewMode === 'ontrain' && !showOneRm) {
      goToOnTrainIndex(onTrainIndex, 'auto');
    }
  }, [viewMode, showOneRm, goToOnTrainIndex, onTrainIndex]);

  useEffect(() => {
    let shouldAdvanceOnTrain = false;
    const focusedWorkout = currentDayWorkouts[onTrainIndex];

    const nextCompletionState: Record<string, boolean> = {};

    workouts.forEach((workout) => {
      const workoutProgress = progress[workout.id] || [];
      const completedSets = workoutProgress.filter(Boolean).length;
      const isDone = completedSets >= workout.total_sets && workoutProgress.length >= workout.total_sets && workoutProgress.every(Boolean);

      nextCompletionState[workout.id] = isDone;

      const previousIsDone = completionSnapshotRef.current[workout.id];
      if (previousIsDone === undefined) {
        return;
      }

      if (!previousIsDone && isDone) {
        onRecordExerciseSnapshot({
          sourceWorkoutId: workout.id,
          exerciseName: workout.exercise,
          reps: workout.reps,
          completedAt: new Date().toISOString(),
          loadValue: loadValues[workout.id] ?? workout.load_kg,
          loadUnit: loadUnits[workout.id] ?? workout.load_unit,
          setsDone: completedSets,
          totalSets: workout.total_sets,
          rpe: rpeValues[workout.id] ?? workout.rpe,
          comment: annotations[workout.id] || '',
        });

        if (viewMode === 'ontrain' && !showOneRm && focusedWorkout?.id === workout.id) {
          shouldAdvanceOnTrain = true;
        }
      }
    });

    completionSnapshotRef.current = nextCompletionState;

    if (shouldAdvanceOnTrain && onTrainIndex < currentDayWorkouts.length - 1) {
      window.setTimeout(() => {
        goToOnTrainIndex(onTrainIndex + 1, 'smooth');
      }, 180);
    }
  }, [
    workouts,
    progress,
    loadValues,
    loadUnits,
    rpeValues,
    annotations,
    onRecordExerciseSnapshot,
    viewMode,
    showOneRm,
    currentDayWorkouts,
    onTrainIndex,
    goToOnTrainIndex,
  ]);

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

  const onTrainCurrentWorkout = currentDayWorkouts[onTrainIndex];
  const onTrainNextWorkout = onTrainIndex < currentDayWorkouts.length - 1 ? currentDayWorkouts[onTrainIndex + 1] : null;
  const remainingOnTrain = Math.max(0, currentDayWorkouts.length - (onTrainIndex + 1));

  const onTrainLastSnapshot = useMemo(() => {
    if (!onTrainCurrentWorkout) {
      return null;
    }

    return onGetLastExerciseSnapshot(onTrainCurrentWorkout.exercise, {
      reps: onTrainCurrentWorkout.reps,
      excludeWorkoutId: onTrainCurrentWorkout.id,
    });
  }, [onGetLastExerciseSnapshot, onTrainCurrentWorkout]);

  const handleSetToggle = (workoutId: string, setIndex: number, totalSets: number) => {
    onToggleSet(workoutId, setIndex, totalSets);

    const currentProgress = progress[workoutId] || [];
    const isCurrentlyChecked = currentProgress[setIndex] === true;

    if (!isCurrentlyChecked) {
      const start = Date.now();
      setTimerStartTime(start);
      setActiveTimerWorkoutId(workoutId);

      const workout = currentDayWorkouts.find(w => w.id === workoutId);
      if (workout) {
        const completedCount = currentProgress.filter(Boolean).length;
        const currentSeries = completedCount + 1;

        import('../utils/notification').then(({ NotificationTimer }) => {
          NotificationTimer.start({
            title: `IronTrack - ${t('exercise_notification')}: ${workout.exercise} ${currentSeries}/${workout.total_sets}`,
            startTime: start
          }).catch(e => console.error('Notification Plugin Error:', e));
        });
      }
    } else {
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
      <header ref={headerRef} className="sticky top-0 z-30 bg-gym-900/95 backdrop-blur-md border-b border-gym-800 shadow-xl">
        <div className="max-w-3xl mx-auto px-4 py-3">

          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <div className="bg-gym-accent p-1.5 rounded-lg">
                <Trophy size={18} className="text-white" />
              </div>
              <h1 className="text-lg font-bold text-white">IronTrack</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!isOnTrainEnabled) {
                    setShowOneRm(false);
                  }
                  onSetViewMode(isOnTrainEnabled ? 'classic' : 'ontrain');
                }}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                  isOnTrainEnabled
                    ? 'border-gym-accent text-gym-accent bg-gym-accent/10'
                    : 'border-gym-700 text-gym-400 hover:text-white hover:border-gym-600'
                }`}
              >
                {isOnTrainEnabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                <span>{t('ontrain_toggle_label')}</span>
              </button>
              <button
                onClick={() => setShowSettingsMenu(true)}
                className="text-xs text-gym-500 hover:text-white flex items-center space-x-1"
              >
                <Settings size={14} />
                <span>{t('settings')}</span>
              </button>
            </div>
          </div>

          {!isOnTrainEnabled && (
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setShowOneRm(true)}
                className={`
                  whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all
                  ${showOneRm
                    ? 'bg-white text-gym-900 shadow-md'
                    : 'bg-gym-800 text-gym-400 hover:bg-gym-700'
                  }
                `}
              >
                {t('one_rm_tab')}
              </button>
              {weeks.map(week => (
                <button
                  key={week}
                  onClick={() => {
                    setShowOneRm(false);
                    handleWeekSelect(week);
                  }}
                  className={`
                    whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all
                    ${!showOneRm && selectedWeek === week
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

            {!showOneRm && (
              <div className="flex border-b border-gym-700 overflow-x-auto no-scrollbar">
                {days.map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`
                      px-6 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap
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
            )}
          </div>
          )}
        </div>

        <div className="h-1 w-full bg-gym-800">
          <div
            className="h-full bg-gym-accent transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </header>

      <main className={`max-w-3xl mx-auto px-4 ${isOnTrainEnabled && !showOneRm ? 'py-3' : 'py-6'}`}>
        {showOneRm ? (
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">{t('one_rm_label')}</h2>
                <p className="text-gym-400 text-sm">{t('one_rm_subtitle')}</p>
              </div>
            </div>
            <OneRmSection values={oneRmValues} onChangeValue={onUpdateOneRmValue} />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-end mb-4">
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

            {isOnTrainEnabled ? (
              <>
                {currentDayWorkouts.length === 0 ? (
                  <div className="text-center py-20 bg-gym-800/50 rounded-xl border border-dashed border-gym-700">
                    <p className="text-gym-500">{t('no_exercises_found')}</p>
                  </div>
                ) : (
                    <div className="space-y-2">
                    <div ref={onTrainTopRowRef} className="flex items-stretch gap-2">
                      <button
                        onClick={() => goToOnTrainIndex(onTrainIndex - 1, 'smooth')}
                        disabled={onTrainIndex === 0}
                        className={`rounded-lg border border-gym-700 bg-gym-900/85 px-3 py-2 w-[35%] text-left transition-opacity ${
                          onTrainIndex === 0 ? 'opacity-0 pointer-events-none' : 'hover:border-gym-500'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-gym-500 mb-1">
                          <ChevronLeft size={12} />
                          <span>{t('previous_exercise')}</span>
                        </div>
                        {onTrainIndex > 0 && currentDayWorkouts[onTrainIndex - 1] ? (
                          <>
                            <p className="text-xs font-semibold text-white truncate">{currentDayWorkouts[onTrainIndex - 1].exercise}</p>
                            <p className="text-[11px] text-gym-400 truncate">{getWorkoutLoadLabel(currentDayWorkouts[onTrainIndex - 1])}</p>
                          </>
                        ) : (
                          <p className="text-xs text-gym-500">{t('previous_exercise_none')}</p>
                        )}
                      </button>

                      <div className="rounded-lg border border-gym-700 bg-gym-900/85 px-3 py-2 w-[30%]">
                        <div className="text-[10px] uppercase tracking-wide text-gym-500">{t('ontrain_progress')}</div>
                        <div className="mt-1 text-sm font-semibold text-white">
                          {onTrainIndex + 1}/{currentDayWorkouts.length}
                        </div>
                        <div className="text-[11px] text-gym-500">{t('ontrain_remaining', { count: remainingOnTrain })}</div>
                      </div>

                      <button
                        onClick={() => goToOnTrainIndex(onTrainIndex + 1, 'smooth')}
                        disabled={onTrainIndex >= currentDayWorkouts.length - 1}
                        className={`rounded-lg border border-gym-700 bg-gym-900/85 px-3 py-2 w-[35%] text-left transition-opacity ${
                          onTrainIndex >= currentDayWorkouts.length - 1 ? 'opacity-0 pointer-events-none' : 'hover:border-gym-500'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-gym-500 mb-1">
                          <ChevronRight size={12} />
                          <span>{t('next_exercise')}</span>
                        </div>
                        {onTrainNextWorkout ? (
                          <>
                            <p className="text-xs font-semibold text-white truncate">{onTrainNextWorkout.exercise}</p>
                            <p className="text-[11px] text-gym-400 truncate">{getWorkoutLoadLabel(onTrainNextWorkout)}</p>
                          </>
                        ) : (
                          <p className="text-xs text-gym-500">{t('next_exercise_none')}</p>
                        )}
                      </button>
                    </div>

                    <div className="rounded-2xl border border-gym-800/80 bg-gym-900/20 p-2" style={{ height: `${onTrainViewportHeight}px` }}>
                      <div
                        ref={carouselRef}
                        onScroll={handleCarouselScroll}
                        className="h-full overflow-x-auto no-scrollbar snap-x snap-mandatory flex"
                      >
                        {currentDayWorkouts.map((workout) => (
                          <div key={workout.id} className="snap-start shrink-0 w-full h-full">
                            <ExerciseCard
                              variant="ontrain"
                              workout={workout}
                              completedSets={progress[workout.id] || []}
                              onToggleSet={(setIndex) => handleSetToggle(workout.id, setIndex, workout.total_sets)}
                              showTimer={activeTimerWorkoutId === workout.id}
                              timerStartTime={timerStartTime}
                              isFinished={isWorkoutDone(workout)}
                              annotation={annotations[workout.id] || ''}
                              onAnnotationChange={(annotation) => onUpdateAnnotation(workout.id, annotation)}
                              rpeValue={rpeValues[workout.id] ?? workout.rpe}
                              onRpeValueChange={(rpeValue) => onUpdateRpeValue(workout.id, rpeValue)}
                              loadValue={loadValues[workout.id]}
                              loadUnit={loadUnits[workout.id] ?? workout.load_unit}
                              onLoadValueChange={(loadValue) => onUpdateLoadValue(workout.id, loadValue)}
                              onLoadUnitChange={(loadUnit) => onUpdateLoadUnit(workout.id, loadUnit)}
                              oneRmValues={oneRmValues}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {onTrainCurrentWorkout && (
                      <div ref={onTrainHistoryRef} className="rounded-xl border border-gym-700 bg-gym-900/88 px-3 py-2 shadow-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase tracking-wide text-gym-500 font-semibold">
                            {t('last_session')}
                          </span>
                          {onTrainLastSnapshot && (
                            <span className="text-[10px] text-gym-500">
                              {formatHistoryDate(onTrainLastSnapshot.completedAt)}
                            </span>
                          )}
                        </div>

                        {onTrainLastSnapshot ? (
                          <>
                            <div className="flex items-center gap-3 text-xs text-gym-300 whitespace-nowrap overflow-hidden">
                              <span className="inline-flex items-center gap-1">
                                <Dumbbell size={12} className="text-gym-accent" />
                                {onTrainLastSnapshot.loadValue} {onTrainLastSnapshot.loadUnit}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <CheckCircle size={12} className="text-emerald-500" />
                                SETS {onTrainLastSnapshot.setsDone}/{onTrainLastSnapshot.totalSets}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Activity size={12} className="text-amber-500" />
                                RPE {onTrainLastSnapshot.rpe}
                              </span>
                              <span className="text-gym-500">REPS {onTrainLastSnapshot.reps}</span>
                            </div>
                            <div className="mt-1 text-xs text-gym-400 truncate flex items-center gap-1">
                              <MessageSquare size={11} className="text-gym-500" />
                              <span>{onTrainLastSnapshot.comment || t('last_session_no_comment')}</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gym-500">{t('last_session_empty')}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
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
                    oneRmValues={oneRmValues}
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
                          oneRmValues={oneRmValues}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

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
