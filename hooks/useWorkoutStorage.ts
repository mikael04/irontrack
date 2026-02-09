import { useState, useEffect, useCallback } from 'react';
import { WorkoutRaw, WorkoutProgress } from '../types';
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY_DATA = 'irontrack_data';
const STORAGE_KEY_PROGRESS = 'irontrack_progress';
const STORAGE_KEY_ORDER = 'irontrack_completion_order';
const STORAGE_KEY_SELECTION = 'irontrack_selection';

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

interface SelectionState {
  week: number | null;
  day: string | null;
}

export const useWorkoutStorage = () => {
  const [workouts, setWorkouts] = useState<WorkoutRaw[]>([]);
  const [progress, setProgress] = useState<WorkoutProgress>({});
  const [completionOrder, setCompletionOrder] = useState<string[]>([]);
  const [selection, setSelection] = useState<SelectionState>({ week: null, day: null });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadStorage = async () => {
      try {
        const storedData = await getData(STORAGE_KEY_DATA);
        const storedProgress = await getData(STORAGE_KEY_PROGRESS);
        const storedOrder = await getData(STORAGE_KEY_ORDER);
        const storedSelection = await getData(STORAGE_KEY_SELECTION);

        if (storedData) {
          setWorkouts(storedData);
        }
        if (storedProgress) {
          setProgress(storedProgress);
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

  const importWorkouts = useCallback(async (newWorkouts: WorkoutRaw[]) => {
    await removeData(STORAGE_KEY_DATA);
    await removeData(STORAGE_KEY_PROGRESS);
    await removeData(STORAGE_KEY_ORDER);
    await removeData(STORAGE_KEY_SELECTION);
    
    setWorkouts(newWorkouts);
    setProgress({});
    setCompletionOrder([]);
    setSelection({ week: null, day: null });
    await setData(STORAGE_KEY_DATA, newWorkouts);
  }, []);

  const clearData = useCallback(async () => {
    await removeData(STORAGE_KEY_DATA);
    await removeData(STORAGE_KEY_PROGRESS);
    await removeData(STORAGE_KEY_ORDER);
    await removeData(STORAGE_KEY_SELECTION);
    setWorkouts([]);
    setProgress({});
    setCompletionOrder([]);
    setSelection({ week: null, day: null });
  }, []);

  return {
    workouts,
    progress,
    completionOrder,
    selection,
    isLoaded,
    toggleSet,
    saveSelection,
    importWorkouts,
    clearData
  };
};
