export type LoadUnit = 'kg' | 'bar' | 'dumb';
export type ViewMode = 'classic' | 'ontrain';
export type OneRmMovementId = 'squat' | 'bench' | 'deadlift';

export interface OneRmValues {
  squat: string;
  bench: string;
  deadlift: string;
}

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
  load_unit: LoadUnit;
  load_unit_selected?: LoadUnit;
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
  load_unit?: string;
  load_unit_selected?: string;
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

// Armazena valores de carga selecionados pelo usuário para cada exercício (workoutId -> carga)
export type WorkoutLoadValues = Record<string, string>;

// Armazena unidade de carga selecionada pelo usuário para cada exercício (workoutId -> unidade)
export type WorkoutLoadUnits = Record<string, LoadUnit>;

export interface ExerciseHistoryEntry {
  id: string;
  sourceWorkoutId: string;
  exerciseName: string;
  exerciseNameKey: string;
  reps: string;
  completedAt: string;
  loadValue: string;
  loadUnit: LoadUnit;
  setsDone: number;
  totalSets: number;
  rpe: string;
  comment: string;
}

export type ExerciseHistoryMap = Record<string, ExerciseHistoryEntry[]>;

export interface AppState {
  isInitialized: boolean;
  workouts: WorkoutRaw[];
  progress: WorkoutProgress;
  annotations: WorkoutAnnotations;
  rpeValues: WorkoutRPEValues;
  loadValues: WorkoutLoadValues;
  loadUnits: WorkoutLoadUnits;
  oneRmValues: OneRmValues;
}
