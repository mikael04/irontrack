export interface WorkoutRaw {
  id: string;
  week: number;
  day: string;
  focus: string;
  exercise: string;
  total_sets: number;
  reps: string;
  load_pct: string;
  load_kg: string;
  rpe: string;
  rest: string;
}

export interface CSVRow {
  week: string;
  day: string;
  focus: string;
  exercise: string;
  sets: string;
  reps: string;
  load_pct: string;
  load_kg: string;
  rpe: string;
  rest: string;
}

export type WorkoutProgress = Record<string, boolean[]>;

export interface AppState {
  isInitialized: boolean;
  workouts: WorkoutRaw[];
  progress: WorkoutProgress;
}
