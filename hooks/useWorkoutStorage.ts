import { useState, useEffect, useCallback } from 'react';
import { WorkoutRaw, WorkoutProgress, WorkoutAnnotations, ImportMode } from '../types';
import { Preferences } from '@capacitor/preferences';
import { generateExportData, saveCsvFile, ExportData } from '../utils/exportCsv';

const STORAGE_KEY_DATA = 'irontrack_data';
const STORAGE_KEY_PROGRESS = 'irontrack_progress';
const STORAGE_KEY_ORDER = 'irontrack_completion_order';
const STORAGE_KEY_SELECTION = 'irontrack_selection';
const STORAGE_KEY_ANNOTATIONS = 'irontrack_annotations';

const setData = async (key: string, value: any) => {
  await Preferences.set({ key, value: JSON.stringify(value) });
};

const getData = async (key: string) => {
  const { value } = await Preferences.get({ key });
  return value ? JSON.parse(value) : null;
};

const removeData = async (key: string) => {
  await Preferences.remove({ key });
};

const normalizeWorkout = (workout: WorkoutRaw): WorkoutRaw => {
  return {
    ...workout,
    prep: typeof workout.prep === 'string' && workout.prep.trim().length > 0 ? workout.prep : '-',
  };
};

interface SelectionState {
  week: number | null;
  day: string | null;
}

export const useWorkoutStorage = () => {
  const [workouts, setWorkouts] = useState<WorkoutRaw[]>([]);
  const [progress, setProgress] = useState<WorkoutProgress>({});
  const [annotations, setAnnotations] = useState<WorkoutAnnotations>({});
  const [completionOrder, setCompletionOrder] = useState<string[]>([]);
  const [selection, setSelection] = useState<SelectionState>({ week: null, day: null });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadStorage = async () => {
      try {
        const storedData = await getData(STORAGE_KEY_DATA);
        const storedProgress = await getData(STORAGE_KEY_PROGRESS);
        const storedAnnotations = await getData(STORAGE_KEY_ANNOTATIONS);
        const storedOrder = await getData(STORAGE_KEY_ORDER);
        const storedSelection = await getData(STORAGE_KEY_SELECTION);

        if (storedData) {
          const normalizedWorkouts = (storedData as WorkoutRaw[]).map(normalizeWorkout);
          setWorkouts(normalizedWorkouts);
          await setData(STORAGE_KEY_DATA, normalizedWorkouts);
        }
        if (storedProgress) {
          setProgress(storedProgress);
        }
        if (storedAnnotations) {
          setAnnotations(storedAnnotations);
        }
        if (storedOrder) {
          setCompletionOrder(storedOrder);
        }
        if (storedSelection) {
          setSelection(storedSelection);
        }
      } catch (e) {
        console.error("Failed to load workout data", e);
      } finally {
        setIsLoaded(true);
      }
    };

    loadStorage();
  }, []);

  const toggleSet = useCallback((workoutId: string, setIndex: number, totalSets: number) => {
    setProgress((prev) => {
      const currentSets = prev[workoutId] || Array(totalSets).fill(false);
      const newSets = [...currentSets];
      while (newSets.length < totalSets) newSets.push(false);

      newSets[setIndex] = !newSets[setIndex];

      const newProgress = { ...prev, [workoutId]: newSets };
      setData(STORAGE_KEY_PROGRESS, newProgress);

      const isComplete = newSets.every(Boolean) && newSets.length === totalSets;

      setCompletionOrder(prevOrder => {
        let newOrder = [...prevOrder];

        if (isComplete) {
          if (!newOrder.includes(workoutId)) {
            newOrder.push(workoutId);
          }
        } else {
          newOrder = newOrder.filter(id => id !== workoutId);
        }

        setData(STORAGE_KEY_ORDER, newOrder);
        return newOrder;
      });

      return newProgress;
    });
  }, []);

  const saveSelection = useCallback((week: number, day: string) => {
    const newSelection = { week, day };
    setSelection(newSelection);
    setData(STORAGE_KEY_SELECTION, newSelection);
  }, []);

  const updateAnnotation = useCallback((workoutId: string, annotation: string) => {
    setAnnotations((prev) => {
      const newAnnotations = { ...prev, [workoutId]: annotation };
      setData(STORAGE_KEY_ANNOTATIONS, newAnnotations);
      return newAnnotations;
    });
  }, []);

  const importWorkouts = useCallback(async (newWorkouts: WorkoutRaw[], mode: ImportMode = 'replace') => {
    const normalizedWorkouts = newWorkouts.map(normalizeWorkout);

    if (mode === 'replace') {
      await removeData(STORAGE_KEY_DATA);
      await removeData(STORAGE_KEY_PROGRESS);
      await removeData(STORAGE_KEY_ANNOTATIONS);
      await removeData(STORAGE_KEY_ORDER);
      await removeData(STORAGE_KEY_SELECTION);

      setWorkouts(normalizedWorkouts);
      setProgress({});
      setAnnotations({});
      setCompletionOrder([]);
      setSelection({ week: null, day: null });
      await setData(STORAGE_KEY_DATA, normalizedWorkouts);
    } else {
      const mergedProgress: WorkoutProgress = { ...progress };
      const mergedAnnotations: WorkoutAnnotations = { ...annotations };

      normalizedWorkouts.forEach(newWorkout => {
        const existingWorkout = workouts.find(
          w => w.week === newWorkout.week &&
               w.day === newWorkout.day &&
               w.exercise === newWorkout.exercise
        );

        if (existingWorkout) {
          mergedProgress[newWorkout.id] = progress[existingWorkout.id] || [];
          mergedAnnotations[newWorkout.id] = annotations[existingWorkout.id] || '';
        }
      });

      setWorkouts(normalizedWorkouts);
      setProgress(mergedProgress);
      setAnnotations(mergedAnnotations);
      await setData(STORAGE_KEY_DATA, normalizedWorkouts);
      await setData(STORAGE_KEY_PROGRESS, mergedProgress);
      await setData(STORAGE_KEY_ANNOTATIONS, mergedAnnotations);
    }
  }, [workouts, progress, annotations]);

  const exportWorkouts = useCallback(async (): Promise<string> => {
    const exportData: ExportData = {
      workouts,
      progress,
      annotations,
    };

    const csvContent = generateExportData(exportData);
    const filePath = await saveCsvFile(csvContent);
    return filePath;
  }, [workouts, progress, annotations]);

  const clearData = useCallback(async () => {
    await removeData(STORAGE_KEY_DATA);
    await removeData(STORAGE_KEY_PROGRESS);
    await removeData(STORAGE_KEY_ANNOTATIONS);
    await removeData(STORAGE_KEY_ORDER);
    await removeData(STORAGE_KEY_SELECTION);
    setWorkouts([]);
    setProgress({});
    setAnnotations({});
    setCompletionOrder([]);
    setSelection({ week: null, day: null });
  }, []);

  return {
    workouts,
    progress,
    annotations,
    completionOrder,
    selection,
    isLoaded,
    toggleSet,
    updateAnnotation,
    saveSelection,
    importWorkouts,
    exportWorkouts,
    clearData
  };
};
