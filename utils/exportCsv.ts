import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { WorkoutRaw, WorkoutProgress, WorkoutAnnotations, CSVRow } from '../types';

export interface ExportData {
  workouts: WorkoutRaw[];
  progress: WorkoutProgress;
  annotations: WorkoutAnnotations;
}

const getCompletedSets = (workoutId: string, progress: WorkoutProgress, totalSets: number): string => {
  const sets = progress[workoutId] || [];
  const completed = sets.filter(Boolean).length;
  return `${completed}/${totalSets}`;
};

const isWorkoutComplete = (workoutId: string, progress: WorkoutProgress, totalSets: number): string => {
  const sets = progress[workoutId] || [];
  const completed = sets.filter(Boolean).length;
  return completed >= totalSets ? 'Sim' : 'Não';
};

export const generateExportData = (data: ExportData): string => {
  const { workouts, progress, annotations } = data;

  const headers = [
    'Semana',
    'Dia',
    'Foco',
    'Exercício',
    'Séries',
    'Repetições',
    'Carga %',
    'Carga (kg)',
    'RPE',
    'Descanso',
    'Concluído',
    'Séries Feitas',
    'Anotação'
  ];

  const rows: CSVRow[] = workouts.map(workout => {
    const completedSets = getCompletedSets(workout.id, progress, workout.total_sets);
    const isComplete = isWorkoutComplete(workout.id, progress, workout.total_sets);
    const annotation = annotations[workout.id] || '';

    return {
      week: workout.week.toString(),
      day: workout.day,
      focus: workout.focus,
      exercise: workout.exercise,
      sets: workout.total_sets.toString(),
      reps: workout.reps,
      load_pct: workout.load_pct,
      load_kg: workout.load_kg,
      rpe: workout.rpe,
      rest: workout.rest,
      concluido: isComplete,
      series_feitas: completedSets,
      anotacao: annotation,
    };
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => [
      row.week,
      row.day,
      row.focus,
      `"${row.exercise}"`,
      row.sets,
      row.reps,
      row.load_pct,
      row.load_kg,
      row.rpe,
      row.rest,
      row.concluido || 'Não',
      row.series_feitas || `0/${row.sets}`,
      `"${(row.anotacao || '').replace(/"/g, '""')}"`,
    ].join(','))
  ].join('\n');

  return csvContent;
};

export const saveCsvFile = async (csvContent: string, fileName: string = 'irontrack_export.csv'): Promise<string> => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const finalFileName = `irontrack_${timestamp}.csv`;

    // Check and request permissions
    const permissions = await Filesystem.checkPermissions();
    console.log('Filesystem permissions:', permissions);

    if (permissions.publicStorage !== 'granted') {
      const result = await Filesystem.requestPermissions();
      console.log('Permission request result:', result);
    }

    // Try writing to Documents directory first (more reliable)
    await Filesystem.writeFile({
      path: finalFileName,
      data: csvContent,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });

    // Get the actual file URI
    const uriResult = await Filesystem.getUri({
      path: finalFileName,
      directory: Directory.Documents,
    });

    console.log('File saved to:', uriResult.uri);
    return uriResult.uri;
  } catch (error) {
    console.error('Failed to save CSV file:', error);
    throw error;
  }
};
