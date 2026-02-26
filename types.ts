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
  concluido?: string;
  series_feitas?: string;
  anotacao?: string;
}

export type ImportMode = 'replace' | 'merge';

export type WorkoutProgress = Record<string, boolean[]>;

// Armazena anotações para cada exercício (workoutId -> texto da anotação)
export type WorkoutAnnotations = Record<string, string>;

export interface AppState {
  isInitialized: boolean;
  workouts: WorkoutRaw[];
  progress: WorkoutProgress;
  annotations: WorkoutAnnotations;
}
