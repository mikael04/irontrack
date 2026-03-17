import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { WorkoutRaw, WorkoutProgress, WorkoutAnnotations, WorkoutRPEValues, WorkoutLoadValues, WorkoutLoadUnits, CSVRow } from '../types';
import { formatLoadUnitForExport, normalizeLoadUnit } from './loadUnit';

export interface ExportData {
  workouts: WorkoutRaw[];
  progress: WorkoutProgress;
  annotations: WorkoutAnnotations;
  rpeValues: WorkoutRPEValues;
  loadValues: WorkoutLoadValues;
  loadUnits: WorkoutLoadUnits;
}

const TSV_DELIMITER = '\t';

const escapeTsvField = (value: string): string => {
  const escaped = value.replace(/"/g, '""');
  const requiresQuoting =
    escaped.includes(TSV_DELIMITER) || escaped.includes('\n') || escaped.includes('"');

  return requiresQuoting ? `"${escaped}"` : escaped;
};

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
  const { workouts, progress, annotations, rpeValues, loadValues, loadUnits } = data;

  const headers = [
    'Semana',
    'Dia',
    'Foco',
    'Exercício',
    'Séries',
    'Repetições',
    'Prep',
    'Carga %',
    'Carga (kg)',
    'Tipo de Carga (Plano)',
    'Tipo de Carga (Selecionado)',
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
    // Usa o RPE selecionado pelo usuário, ou o padrão do workout se não tiver sido alterado
    const userRpe = rpeValues[workout.id];
    const rpe = userRpe !== undefined ? userRpe : workout.rpe;
    const loadValue = loadValues[workout.id];
    const loadKg = loadValue !== undefined ? loadValue : workout.load_kg;
    const planUnit = normalizeLoadUnit(workout.load_unit);
    const unitValue = loadUnits[workout.id];
    const loadUnit = unitValue !== undefined ? unitValue : planUnit;

    return {
      week: workout.week.toString(),
      day: workout.day,
      focus: workout.focus,
      exercise: workout.exercise,
      sets: workout.total_sets.toString(),
      reps: workout.reps,
      prep: workout.prep,
      load_pct: workout.load_pct,
      load_kg: loadKg,
      load_unit: planUnit,
      load_unit_selected: loadUnit,
      rpe: rpe,
      rest: workout.rest,
      concluido: isComplete,
      series_feitas: completedSets,
      anotacao: annotation,
    };
  });

  const tsvContent = [
    headers.join(TSV_DELIMITER),
    ...rows.map(row => [
      row.week,
      row.day,
      row.focus,
      row.exercise,
      row.sets,
      row.reps,
      row.prep || '-',
      row.load_pct,
      row.load_kg,
      formatLoadUnitForExport(normalizeLoadUnit(row.load_unit)),
      formatLoadUnitForExport(normalizeLoadUnit(row.load_unit_selected)),
      row.rpe,
      row.rest,
      row.concluido || 'Não',
      row.series_feitas || `0/${row.sets}`,
      row.anotacao || '',
    ].map(escapeTsvField).join(TSV_DELIMITER))
  ].join('\n');

  return tsvContent;
};

export const saveCsvFile = async (csvContent: string, fileName: string = 'irontrack_export.tsv'): Promise<string> => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const normalizedFileName = fileName.endsWith('.tsv') ? fileName : `${fileName}.tsv`;
    const finalFileName = normalizedFileName === 'irontrack_export.tsv'
      ? `irontrack_${timestamp}.tsv`
      : normalizedFileName;

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

    console.log('TSV file saved to:', uriResult.uri);
    return uriResult.uri;
  } catch (error) {
    console.error('Failed to save TSV file:', error);
    throw error;
  }
};
