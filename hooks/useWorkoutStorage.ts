import { useState, useEffect, useCallback } from 'react';
import {
  WorkoutRaw,
  WorkoutProgress,
  WorkoutAnnotations,
  WorkoutRPEValues,
  WorkoutLoadValues,
  WorkoutLoadUnits,
  ImportMode,
  ViewMode,
  ExerciseHistoryEntry,
  ExerciseHistoryMap,
  OneRmValues,
  OneRmMovementId,
  WorkoutDoneStatus,
  ParsedImportData,
} from '../types';
import { generateExportData, saveCsvFile, ExportData } from '../utils/exportCsv';
import { normalizeLoadUnit } from '../utils/loadUnit';
import { storageRepository, STORAGE_KEYS } from '../services/storageRepository';

const normalizeWorkout = (workout: WorkoutRaw): WorkoutRaw => {
  return {
    ...workout,
    prep: typeof workout.prep === 'string' && workout.prep.trim().length > 0 ? workout.prep : '-',
    load_unit: normalizeLoadUnit(workout.load_unit),
    load_unit_selected: workout.load_unit_selected ? normalizeLoadUnit(workout.load_unit_selected) : undefined,
  };
};

const normalizeExerciseName = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
};

interface BuildHistoryInput {
  workouts: WorkoutRaw[];
  progress: WorkoutProgress;
  annotations: WorkoutAnnotations;
  rpeValues: WorkoutRPEValues;
  loadValues: WorkoutLoadValues;
  loadUnits: WorkoutLoadUnits;
  doneStatus: WorkoutDoneStatus;
  baseHistory: ExerciseHistoryMap;
  completedAt: string;
  skipWorkoutIds?: Set<string>;
}

const buildImportedExerciseHistory = (input: BuildHistoryInput): ExerciseHistoryMap => {
  const { workouts, progress, annotations, rpeValues, loadValues, loadUnits, doneStatus, baseHistory, completedAt, skipWorkoutIds } = input;
  const next: ExerciseHistoryMap = { ...baseHistory };

  const hasMatchingEntry = (exerciseNameKey: string, candidate: ExerciseHistoryEntry): boolean => {
    const list = next[exerciseNameKey] || [];
    return list.some((entry) =>
      entry.exerciseName === candidate.exerciseName &&
      entry.reps === candidate.reps &&
      entry.loadValue === candidate.loadValue &&
      entry.loadUnit === candidate.loadUnit &&
      entry.setsDone === candidate.setsDone &&
      entry.totalSets === candidate.totalSets &&
      entry.rpe === candidate.rpe &&
      entry.comment === candidate.comment,
    );
  };

  workouts.forEach((workout) => {
    if (skipWorkoutIds?.has(workout.id)) {
      return;
    }

    const sets = progress[workout.id] || [];
    const completedSets = sets.filter(Boolean).length;
    const allSetsDone = sets.length >= workout.total_sets && sets.every(Boolean);
    const status = doneStatus[workout.id];
    const isFinished = allSetsDone || status === 'done' || status === 'undone';

    if (!isFinished) {
      return;
    }

    const exerciseNameKey = normalizeExerciseName(workout.exercise);
    if (!exerciseNameKey) {
      return;
    }

    const loadValue = (loadValues[workout.id] ?? workout.load_kg ?? '').trim() || '0';
    const loadUnit = normalizeLoadUnit(loadUnits[workout.id] ?? workout.load_unit);
    const rpe = (rpeValues[workout.id] ?? workout.rpe ?? '-').trim() || '-';
    const comment = (annotations[workout.id] ?? '').trim();

    const newEntry: ExerciseHistoryEntry = {
      id: `${workout.id}_${completedAt}`,
      sourceWorkoutId: workout.id,
      exerciseName: workout.exercise.trim() || 'Unknown Exercise',
      exerciseNameKey,
      reps: workout.reps?.trim() || '-',
      completedAt,
      loadValue,
      loadUnit,
      setsDone: status === 'undone' ? 0 : completedSets,
      totalSets: workout.total_sets,
      rpe,
      comment,
    };

    if (hasMatchingEntry(exerciseNameKey, newEntry)) {
      return;
    }

    const updatedEntries = [...(next[exerciseNameKey] || []), newEntry]
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 100);

    next[exerciseNameKey] = updatedEntries;
  });

  return next;
};

interface SelectionState {
  week: number | null;
  day: string | null;
}

interface RecordExerciseSnapshotInput {
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
}

interface LastExerciseSnapshotOptions {
  reps?: string;
  excludeWorkoutId?: string;
  beforeDate?: string;
}

const DEFAULT_ONE_RM_VALUES: OneRmValues = {
  squat: '',
  bench: '',
  deadlift: '',
};

const persistKey = async <T,>(key: string, value: T) => {
  try {
    await storageRepository.set(key, value);
  } catch (error) {
    console.error(`Failed to persist key ${key}`, error);
  }
};

export const useWorkoutStorage = () => {
  const [workouts, setWorkouts] = useState<WorkoutRaw[]>([]);
  const [progress, setProgress] = useState<WorkoutProgress>({});
  const [annotations, setAnnotations] = useState<WorkoutAnnotations>({});
  const [rpeValues, setRpeValues] = useState<WorkoutRPEValues>({});
  const [loadValues, setLoadValues] = useState<WorkoutLoadValues>({});
  const [loadUnits, setLoadUnits] = useState<WorkoutLoadUnits>({});
  const [completionOrder, setCompletionOrder] = useState<string[]>([]);
  const [selection, setSelection] = useState<SelectionState>({ week: null, day: null });
  const [viewMode, setViewModeState] = useState<ViewMode>('classic');
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistoryMap>({});
  const [oneRmValues, setOneRmValues] = useState<OneRmValues>(DEFAULT_ONE_RM_VALUES);
  const [doneStatus, setDoneStatus] = useState<WorkoutDoneStatus>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadStorage = async () => {
      try {
        await storageRepository.init();

        const [
          storedData,
          storedProgress,
          storedAnnotations,
          storedRpeValues,
          storedLoadValues,
          storedLoadUnits,
          storedOrder,
          storedSelection,
          storedViewMode,
          storedExerciseHistory,
          storedOneRmValues,
          storedDoneStatus,
        ] = await Promise.all([
          storageRepository.get<WorkoutRaw[]>(STORAGE_KEYS.data),
          storageRepository.get<WorkoutProgress>(STORAGE_KEYS.progress),
          storageRepository.get<WorkoutAnnotations>(STORAGE_KEYS.annotations),
          storageRepository.get<WorkoutRPEValues>(STORAGE_KEYS.rpeValues),
          storageRepository.get<WorkoutLoadValues>(STORAGE_KEYS.loadValues),
          storageRepository.get<WorkoutLoadUnits>(STORAGE_KEYS.loadUnits),
          storageRepository.get<string[]>(STORAGE_KEYS.completionOrder),
          storageRepository.get<SelectionState>(STORAGE_KEYS.selection),
          storageRepository.get<ViewMode>(STORAGE_KEYS.viewMode),
          storageRepository.get<ExerciseHistoryMap>(STORAGE_KEYS.exerciseHistory),
          storageRepository.get<OneRmValues>(STORAGE_KEYS.oneRmValues),
          storageRepository.get<WorkoutDoneStatus>(STORAGE_KEYS.doneStatus),
        ]);

        if (storedData) {
          const normalizedWorkouts = storedData.map(normalizeWorkout);
          setWorkouts(normalizedWorkouts);
          void persistKey(STORAGE_KEYS.data, normalizedWorkouts);
        }
        if (storedProgress) {
          setProgress(storedProgress);
        }
        if (storedAnnotations) {
          setAnnotations(storedAnnotations);
        }
        if (storedRpeValues) {
          setRpeValues(storedRpeValues);
        }
        if (storedLoadValues) {
          setLoadValues(storedLoadValues);
        }
        if (storedLoadUnits) {
          const normalizedUnits: WorkoutLoadUnits = Object.entries(storedLoadUnits).reduce((acc, [key, value]) => {
            acc[key] = normalizeLoadUnit(value as string);
            return acc;
          }, {} as WorkoutLoadUnits);
          setLoadUnits(normalizedUnits);
          void persistKey(STORAGE_KEYS.loadUnits, normalizedUnits);
        }
        if (storedOrder) {
          setCompletionOrder(storedOrder);
        }
        if (storedSelection) {
          setSelection(storedSelection);
        }
        if (storedViewMode === 'classic' || storedViewMode === 'ontrain') {
          setViewModeState(storedViewMode);
        }
        if (storedExerciseHistory && typeof storedExerciseHistory === 'object') {
          const normalizedHistory: ExerciseHistoryMap = Object.entries(storedExerciseHistory).reduce((acc, [key, value]) => {
            if (!Array.isArray(value)) return acc;

            const normalizedEntries = (value as ExerciseHistoryEntry[])
              .map((entry) => ({
                ...entry,
                loadUnit: normalizeLoadUnit(entry.loadUnit),
              }))
              .filter((entry) => Boolean(entry.exerciseNameKey && entry.completedAt));

            if (normalizedEntries.length > 0) {
              acc[key] = normalizedEntries;
            }

            return acc;
          }, {} as ExerciseHistoryMap);
          setExerciseHistory(normalizedHistory);
          void persistKey(STORAGE_KEYS.exerciseHistory, normalizedHistory);
        }

        if (storedOneRmValues) {
          setOneRmValues({
            squat: storedOneRmValues.squat ?? '',
            bench: storedOneRmValues.bench ?? '',
            deadlift: storedOneRmValues.deadlift ?? '',
          });
        }
        if (storedDoneStatus && typeof storedDoneStatus === 'object') {
          const cleaned: WorkoutDoneStatus = {};
          Object.entries(storedDoneStatus).forEach(([key, value]) => {
            if (value === 'done' || value === 'undone') {
              cleaned[key] = value;
            }
          });
          setDoneStatus(cleaned);
        }
      } catch (e) {
        console.error('Failed to load workout data', e);
      } finally {
        setIsLoaded(true);
      }
    };

    void loadStorage();
  }, []);

  const toggleSet = useCallback((workoutId: string, setIndex: number, totalSets: number) => {
    setProgress((prev) => {
      const currentSets = prev[workoutId] || Array(totalSets).fill(false);
      const newSets = [...currentSets];
      while (newSets.length < totalSets) newSets.push(false);

      newSets[setIndex] = !newSets[setIndex];

      const newProgress = { ...prev, [workoutId]: newSets };
      void persistKey(STORAGE_KEYS.progress, newProgress);

      const isComplete = newSets.every(Boolean) && newSets.length === totalSets;

      setCompletionOrder((prevOrder) => {
        let newOrder = [...prevOrder];

        if (isComplete) {
          if (!newOrder.includes(workoutId)) {
            newOrder.push(workoutId);
          }
        } else {
          newOrder = newOrder.filter((id) => id !== workoutId);
        }

        void persistKey(STORAGE_KEYS.completionOrder, newOrder);
        return newOrder;
      });

      if (isComplete) {
        setDoneStatus((prevDone) => {
          if (prevDone[workoutId] === 'done') return prevDone;
          const nextDone = { ...prevDone, [workoutId]: 'done' as const };
          void persistKey(STORAGE_KEYS.doneStatus, nextDone);
          return nextDone;
        });
      }

      return newProgress;
    });
  }, []);

  const markExerciseUndone = useCallback((workoutId: string) => {
    setDoneStatus((prev) => {
      const nextDone = { ...prev, [workoutId]: 'undone' as const };
      void persistKey(STORAGE_KEYS.doneStatus, nextDone);
      return nextDone;
    });

    setCompletionOrder((prevOrder) => {
      if (prevOrder.includes(workoutId)) return prevOrder;
      const newOrder = [...prevOrder, workoutId];
      void persistKey(STORAGE_KEYS.completionOrder, newOrder);
      return newOrder;
    });
  }, []);

  const markExerciseDone = useCallback((workoutId: string) => {
    setDoneStatus((prev) => {
      if (prev[workoutId] === 'done') return prev;
      const nextDone = { ...prev, [workoutId]: 'done' as const };
      void persistKey(STORAGE_KEYS.doneStatus, nextDone);
      return nextDone;
    });
  }, []);

  const saveSelection = useCallback((week: number, day: string) => {
    const newSelection = { week, day };
    setSelection(newSelection);
    void persistKey(STORAGE_KEYS.selection, newSelection);
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    void persistKey(STORAGE_KEYS.viewMode, mode);
  }, []);

  const updateOneRmValue = useCallback((id: OneRmMovementId, value: string) => {
    setOneRmValues((prev) => {
      const nextValues = { ...prev, [id]: value };
      void persistKey(STORAGE_KEYS.oneRmValues, nextValues);
      return nextValues;
    });
  }, []);

  const recordExerciseSnapshot = useCallback((input: RecordExerciseSnapshotInput) => {
    const exerciseNameKey = normalizeExerciseName(input.exerciseName);
    if (!exerciseNameKey) {
      return;
    }

    const completedAt = input.completedAt ?? new Date().toISOString();
    const normalizedLoadUnit = normalizeLoadUnit(input.loadUnit);

    setExerciseHistory((prev) => {
      const previousEntries = prev[exerciseNameKey] || [];
      const newEntry: ExerciseHistoryEntry = {
        id: `${input.sourceWorkoutId}_${Date.now()}`,
        sourceWorkoutId: input.sourceWorkoutId,
        exerciseName: input.exerciseName.trim() || 'Unknown Exercise',
        exerciseNameKey,
        reps: input.reps?.trim() || '-',
        completedAt,
        loadValue: input.loadValue?.trim() || '0',
        loadUnit: normalizedLoadUnit,
        setsDone: input.setsDone,
        totalSets: input.totalSets,
        rpe: input.rpe?.trim() || '-',
        comment: input.comment?.trim() || '',
      };

      const updatedEntries = [...previousEntries, newEntry]
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
        .slice(0, 100);
      const nextHistory = { ...prev, [exerciseNameKey]: updatedEntries };
      void persistKey(STORAGE_KEYS.exerciseHistory, nextHistory);
      return nextHistory;
    });
  }, []);

  const getLastExerciseSnapshot = useCallback((exerciseName: string, options: LastExerciseSnapshotOptions = {}): ExerciseHistoryEntry | null => {
    const exerciseNameKey = normalizeExerciseName(exerciseName);
    if (!exerciseNameKey) {
      return null;
    }

    const allEntries = exerciseHistory[exerciseNameKey] || [];
    if (allEntries.length === 0) {
      return null;
    }

    const beforeDateMs = options.beforeDate ? new Date(options.beforeDate).getTime() : null;

    const filteredEntries = allEntries.filter((entry) => {
      if (options.excludeWorkoutId && entry.sourceWorkoutId === options.excludeWorkoutId) {
        return false;
      }
      if (beforeDateMs && new Date(entry.completedAt).getTime() >= beforeDateMs) {
        return false;
      }
      return true;
    });

    if (filteredEntries.length === 0) {
      return null;
    }

    if (options.reps) {
      const sameReps = filteredEntries.filter((entry) => entry.reps === options.reps);
      if (sameReps.length > 0) {
        return sameReps[0];
      }
    }

    return filteredEntries[0];
  }, [exerciseHistory]);

  const getLastExerciseSnapshots = useCallback((exerciseName: string, options: LastExerciseSnapshotOptions = {}, limit: number = 3): ExerciseHistoryEntry[] => {
    const exerciseNameKey = normalizeExerciseName(exerciseName);
    if (!exerciseNameKey) {
      return [];
    }

    const allEntries = exerciseHistory[exerciseNameKey] || [];
    if (allEntries.length === 0) {
      return [];
    }

    const beforeDateMs = options.beforeDate ? new Date(options.beforeDate).getTime() : null;

    const filteredEntries = allEntries.filter((entry) => {
      if (options.excludeWorkoutId && entry.sourceWorkoutId === options.excludeWorkoutId) {
        return false;
      }
      if (beforeDateMs && new Date(entry.completedAt).getTime() >= beforeDateMs) {
        return false;
      }
      return true;
    });

    if (filteredEntries.length === 0) {
      return [];
    }

    if (options.reps) {
      const sameReps = filteredEntries.filter((entry) => entry.reps === options.reps);
      if (sameReps.length > 0) {
        return sameReps.slice(0, limit);
      }
    }

    return filteredEntries.slice(0, limit);
  }, [exerciseHistory]);

  const updateAnnotation = useCallback((workoutId: string, annotation: string) => {
    setAnnotations((prev) => {
      const newAnnotations = { ...prev, [workoutId]: annotation };
      void persistKey(STORAGE_KEYS.annotations, newAnnotations);
      return newAnnotations;
    });
  }, []);

  const updateRpeValue = useCallback((workoutId: string, rpeValue: string) => {
    setRpeValues((prev) => {
      const newRpeValues = { ...prev, [workoutId]: rpeValue };
      void persistKey(STORAGE_KEYS.rpeValues, newRpeValues);
      return newRpeValues;
    });
  }, []);

  const updateLoadValue = useCallback((workoutId: string, loadValue: string) => {
    const normalized = loadValue.replace(/\./g, ',').replace(/[^0-9,]/g, '');
    const [whole, ...rest] = normalized.split(',');
    let sanitized = whole;
    if (rest.length > 0) {
      sanitized = `${whole},${rest.join('')}`;
    }
    if (sanitized.startsWith(',')) {
      sanitized = `0${sanitized}`;
    }
    setLoadValues((prev) => {
      const newLoadValues = { ...prev, [workoutId]: sanitized };
      void persistKey(STORAGE_KEYS.loadValues, newLoadValues);
      return newLoadValues;
    });
  }, []);

  const updateLoadUnit = useCallback((workoutId: string, loadUnit: string) => {
    const normalizedUnit = normalizeLoadUnit(loadUnit);
    setLoadUnits((prev) => {
      const newLoadUnits = { ...prev, [workoutId]: normalizedUnit };
      void persistKey(STORAGE_KEYS.loadUnits, newLoadUnits);
      return newLoadUnits;
    });
  }, []);

  const importWorkouts = useCallback(async (data: ParsedImportData, mode: ImportMode = 'replace') => {
    const normalizedWorkouts = data.workouts.map(normalizeWorkout);
    const importedProgress = data.progress;
    const importedAnnotations = data.annotations;
    const importedDoneStatus = data.doneStatus;
    const importedLoadUnits: WorkoutLoadUnits = {};

    normalizedWorkouts.forEach((workout) => {
      if (workout.load_unit_selected) {
        importedLoadUnits[workout.id] = workout.load_unit_selected;
      }
    });

    // Helper: remap keys from import-time IDs to final (normalized) IDs
    const remapKeys = <T>(source: Record<string, T>): Record<string, T> => {
      const result: Record<string, T> = {};
      normalizedWorkouts.forEach((workout, index) => {
        const oldId = data.workouts[index]?.id;
        if (oldId && source[oldId] !== undefined) {
          result[workout.id] = source[oldId];
        }
      });
      return result;
    };

    if (mode === 'replace') {
      await storageRepository.clearKeys([
        STORAGE_KEYS.data,
        STORAGE_KEYS.progress,
        STORAGE_KEYS.annotations,
        STORAGE_KEYS.rpeValues,
        STORAGE_KEYS.loadValues,
        STORAGE_KEYS.loadUnits,
        STORAGE_KEYS.completionOrder,
        STORAGE_KEYS.selection,
        STORAGE_KEYS.exerciseHistory,
        STORAGE_KEYS.doneStatus,
      ]);

      // Remap parsed progress/annotations/doneStatus from import IDs to normalized IDs
      const remappedProgress = remapKeys(importedProgress);
      const remappedAnnotations = remapKeys(importedAnnotations);
      const remappedDoneStatus = remapKeys(importedDoneStatus);

      const importCompletedAt = new Date().toISOString();

      // Derive completionOrder from imported progress / done status
      const newCompletionOrder: string[] = normalizedWorkouts
        .filter((w) => {
          const prog = remappedProgress[w.id];
          const allSetsDone = prog && prog.length > 0 && prog.every(Boolean);
          const status = remappedDoneStatus[w.id];
          return allSetsDone || status === 'done' || status === 'undone';
        })
        .map((w) => w.id);

      // Rebuild exercise history from imported finished workouts so "last done" keeps working
      const importedHistory = buildImportedExerciseHistory({
        workouts: normalizedWorkouts,
        progress: remappedProgress,
        annotations: remappedAnnotations,
        rpeValues: {},
        loadValues: {},
        loadUnits: importedLoadUnits,
        doneStatus: remappedDoneStatus,
        baseHistory: exerciseHistory,
        completedAt: importCompletedAt,
      });

      setWorkouts(normalizedWorkouts);
      setProgress(remappedProgress);
      setAnnotations(remappedAnnotations);
      setRpeValues({});
      setLoadValues({});
      setLoadUnits(importedLoadUnits);
      setCompletionOrder(newCompletionOrder);
      setSelection({ week: null, day: null });
      setExerciseHistory(importedHistory);
      setDoneStatus(remappedDoneStatus);
      await persistKey(STORAGE_KEYS.data, normalizedWorkouts);
      await persistKey(STORAGE_KEYS.progress, remappedProgress);
      await persistKey(STORAGE_KEYS.annotations, remappedAnnotations);
      await persistKey(STORAGE_KEYS.loadUnits, importedLoadUnits);
      await persistKey(STORAGE_KEYS.doneStatus, remappedDoneStatus);
      await persistKey(STORAGE_KEYS.completionOrder, newCompletionOrder);
      await persistKey(STORAGE_KEYS.exerciseHistory, importedHistory);
    } else {
      // Merge mode: prefer imported values when present, fall back to existing state
      const mergedProgress: WorkoutProgress = {};
      const mergedAnnotations: WorkoutAnnotations = {};
      const mergedRpeValues: WorkoutRPEValues = {};
      const mergedLoadValues: WorkoutLoadValues = {};
      const mergedLoadUnits: WorkoutLoadUnits = {};
      const mergedDoneStatus: WorkoutDoneStatus = {};
      const newCompletionOrder: string[] = [];
      const existingMergedIds = new Set<string>();

      normalizedWorkouts.forEach((newWorkout, index) => {
        const existingWorkout = workouts.find(
          (w) => w.week === newWorkout.week &&
            w.day === newWorkout.day &&
            w.exercise === newWorkout.exercise,
        );

        const oldImportId = data.workouts[index]?.id;

        if (existingWorkout) {
          existingMergedIds.add(newWorkout.id);

          const importedProg = oldImportId ? importedProgress[oldImportId] : undefined;
          mergedProgress[newWorkout.id] = (importedProg && importedProg.length > 0)
            ? importedProg
            : (progress[existingWorkout.id] || []);

          const importedAnnotation = oldImportId ? importedAnnotations[oldImportId] : undefined;
          mergedAnnotations[newWorkout.id] = (importedAnnotation?.trim() ? importedAnnotation : '')
            || (annotations[existingWorkout.id] || '');

          const importedDone = oldImportId ? importedDoneStatus[oldImportId] : undefined;
          mergedDoneStatus[newWorkout.id] = importedDone || doneStatus[existingWorkout.id];

          mergedRpeValues[newWorkout.id] = rpeValues[existingWorkout.id] || '-';
          mergedLoadValues[newWorkout.id] = loadValues[existingWorkout.id] || '';
          mergedLoadUnits[newWorkout.id] = loadUnits[existingWorkout.id] || normalizeLoadUnit(newWorkout.load_unit);

          // Remap completionOrder
          if (completionOrder.includes(existingWorkout.id)) {
            newCompletionOrder.push(newWorkout.id);
          }
          if (importedDone === 'undone' && !newCompletionOrder.includes(newWorkout.id)) {
            newCompletionOrder.push(newWorkout.id);
          }
        } else {
          // No existing match — use data from the CSV import
          if (oldImportId && importedProgress[oldImportId]) {
            mergedProgress[newWorkout.id] = importedProgress[oldImportId];
          }
          if (oldImportId && importedAnnotations[oldImportId]) {
            mergedAnnotations[newWorkout.id] = importedAnnotations[oldImportId];
          }
          if (oldImportId && importedDoneStatus[oldImportId]) {
            mergedDoneStatus[newWorkout.id] = importedDoneStatus[oldImportId];
          }
          mergedRpeValues[newWorkout.id] = '-';
          mergedLoadValues[newWorkout.id] = '';
          mergedLoadUnits[newWorkout.id] = normalizeLoadUnit(newWorkout.load_unit);

          if (mergedDoneStatus[newWorkout.id] === 'undone') {
            newCompletionOrder.push(newWorkout.id);
          }
        }

        if (newWorkout.load_unit_selected) {
          mergedLoadUnits[newWorkout.id] = newWorkout.load_unit_selected;
        }
      });

      // Also add workouts where all progress sets are checked to completionOrder
      normalizedWorkouts.forEach((w) => {
        if (!newCompletionOrder.includes(w.id)) {
          const prog = mergedProgress[w.id];
          if (prog && prog.length > 0 && prog.every(Boolean)) {
            newCompletionOrder.push(w.id);
          }
        }
      });

      const importCompletedAt = new Date().toISOString();
      const mergedHistory = buildImportedExerciseHistory({
        workouts: normalizedWorkouts,
        progress: mergedProgress,
        annotations: mergedAnnotations,
        rpeValues: mergedRpeValues,
        loadValues: mergedLoadValues,
        loadUnits: mergedLoadUnits,
        doneStatus: mergedDoneStatus,
        baseHistory: exerciseHistory,
        completedAt: importCompletedAt,
        skipWorkoutIds: existingMergedIds,
      });

      setWorkouts(normalizedWorkouts);
      setProgress(mergedProgress);
      setAnnotations(mergedAnnotations);
      setRpeValues(mergedRpeValues);
      setLoadValues(mergedLoadValues);
      setLoadUnits(mergedLoadUnits);
      setDoneStatus(mergedDoneStatus);
      setCompletionOrder(newCompletionOrder);
      setExerciseHistory(mergedHistory);
      await persistKey(STORAGE_KEYS.data, normalizedWorkouts);
      await persistKey(STORAGE_KEYS.progress, mergedProgress);
      await persistKey(STORAGE_KEYS.annotations, mergedAnnotations);
      await persistKey(STORAGE_KEYS.rpeValues, mergedRpeValues);
      await persistKey(STORAGE_KEYS.loadValues, mergedLoadValues);
      await persistKey(STORAGE_KEYS.loadUnits, mergedLoadUnits);
      await persistKey(STORAGE_KEYS.doneStatus, mergedDoneStatus);
      await persistKey(STORAGE_KEYS.completionOrder, newCompletionOrder);
      await persistKey(STORAGE_KEYS.exerciseHistory, mergedHistory);
    }
  }, [workouts, progress, annotations, rpeValues, loadValues, loadUnits, doneStatus, completionOrder]);

  const exportWorkouts = useCallback(async (): Promise<string> => {
    const [
      storedWorkouts,
      storedProgress,
      storedAnnotations,
      storedRpeValues,
      storedLoadValues,
      storedLoadUnits,
      storedDoneStatus,
    ] = await Promise.all([
      storageRepository.get<WorkoutRaw[]>(STORAGE_KEYS.data),
      storageRepository.get<WorkoutProgress>(STORAGE_KEYS.progress),
      storageRepository.get<WorkoutAnnotations>(STORAGE_KEYS.annotations),
      storageRepository.get<WorkoutRPEValues>(STORAGE_KEYS.rpeValues),
      storageRepository.get<WorkoutLoadValues>(STORAGE_KEYS.loadValues),
      storageRepository.get<WorkoutLoadUnits>(STORAGE_KEYS.loadUnits),
      storageRepository.get<WorkoutDoneStatus>(STORAGE_KEYS.doneStatus),
    ]);

    const exportData: ExportData = {
      workouts: storedWorkouts ?? workouts,
      progress: storedProgress ?? progress,
      annotations: storedAnnotations ?? annotations,
      rpeValues: storedRpeValues ?? rpeValues,
      loadValues: storedLoadValues ?? loadValues,
      loadUnits: storedLoadUnits ?? loadUnits,
      doneStatus: storedDoneStatus ?? doneStatus,
    };

    const csvContent = generateExportData(exportData);
    const filePath = await saveCsvFile(csvContent);
    return filePath;
  }, [workouts, progress, annotations, rpeValues, loadValues, loadUnits, doneStatus]);

  const clearData = useCallback(async () => {
    await storageRepository.clearKeys([
      STORAGE_KEYS.data,
      STORAGE_KEYS.progress,
      STORAGE_KEYS.annotations,
      STORAGE_KEYS.rpeValues,
      STORAGE_KEYS.loadValues,
      STORAGE_KEYS.loadUnits,
      STORAGE_KEYS.completionOrder,
      STORAGE_KEYS.selection,
      STORAGE_KEYS.exerciseHistory,
      STORAGE_KEYS.doneStatus,
    ]);
    setWorkouts([]);
    setProgress({});
    setAnnotations({});
    setRpeValues({});
    setLoadValues({});
    setLoadUnits({});
    setCompletionOrder([]);
    setSelection({ week: null, day: null });
    setExerciseHistory({});
    setDoneStatus({});
  }, []);

  return {
    workouts,
    progress,
    annotations,
    rpeValues,
    loadValues,
    loadUnits,
    completionOrder,
    selection,
    viewMode,
    oneRmValues,
    doneStatus,
    isLoaded,
    toggleSet,
    setViewMode,
    updateOneRmValue,
    recordExerciseSnapshot,
    getLastExerciseSnapshot,
    getLastExerciseSnapshots,
    markExerciseUndone,
    markExerciseDone,
    updateAnnotation,
    updateRpeValue,
    updateLoadValue,
    updateLoadUnit,
    saveSelection,
    importWorkouts,
    exportWorkouts,
    clearData,
  };
};
