export interface WorkoutRaw {
  id: string;
  week: number;
  day: string;
  focus: string;
  exercise: string;
  total_sets: number;
  reps: string;
  prep: string;
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
  prep?: string;
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

// Armazena valores de RPE selecionados pelo usuário para cada exercício (workoutId -> valor RPE)
// Valores possíveis: "-" (não selecionado), "1" a "10"
export type WorkoutRPEValues = Record<string, string>;

export interface AppState {
  isInitialized: boolean;
  workouts: WorkoutRaw[];
  progress: WorkoutProgress;
  annotations: WorkoutAnnotations;
  rpeValues: WorkoutRPEValues;
}
