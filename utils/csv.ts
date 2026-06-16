import Papa from 'papaparse';
import { WorkoutRaw, WorkoutProgress, WorkoutAnnotations, WorkoutDoneStatus, ParsedImportData } from '../types';
import { normalizeLoadUnit } from './loadUnit';

const KNOWN_FIELDS = [
  'week',
  'day',
  'focus',
  'exercise',
  'sets',
  'reps',
  'prep',
  'load_pct',
  'load_kg',
  'load_unit',
  'load_unit_selected',
  'rpe',
  'rest',
  'concluido',
  'series_feitas',
  'anotacao',
] as const;

type KnownField = (typeof KNOWN_FIELDS)[number];

const normalizeHeader = (value: string): string => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\-_]/g, ' ')
    .replace(/\r/g, '')
    .trim();
};

const transformHeader = (header: string): string => {
  const h = normalizeHeader(header);

  if (h.includes('semana')) return 'week';
  if (h === 'dia') return 'day';
  if (h.includes('foco')) return 'focus';
  if (h.includes('exercicio')) return 'exercise';
  if (h.includes('serie') && h.includes('feita')) return 'series_feitas';
  if (h.includes('serie')) return 'sets';
  if (h.includes('repeticoe') || h.includes('repeti')) return 'reps';
  if (h === 'prep' || h.includes('preparacao')) return 'prep';
  if (h.includes('carga') && h.includes('%')) return 'load_pct';
  if (h.includes('carga') && (h.includes('selecionad') || h.includes('selected'))) return 'load_unit_selected';
  if (h.includes('carga') && (h.includes('tipo') || h.includes('unidade') || h.includes('medida'))) return 'load_unit';
  if (h.includes('load') && (h.includes('unit') || h.includes('type'))) return 'load_unit';
  if (h.includes('carga')) return 'load_kg';
  if (h.includes('rpe')) return 'rpe';
  if (h.includes('descanso')) return 'rest';
  if (h.includes('concluido') || h === 'status' || h.includes('finalizado') || h.includes('feito') || h.includes('done')) return 'concluido';
  if (h.includes('anotacao') || h.includes('comment') || h.includes('note') || h.includes('observacao')) return 'anotacao';

  return h.replace(/\s+/g, '_');
};

const stripBom = (value: string): string => {
  return value.replace(/^\uFEFF/, '');
};

interface ColumnMapping {
  fieldIndexes: Record<KnownField, number | undefined>;
  annotationIndexes: number[];
  seriesFeitasIndexes: number[];
}

const buildColumnMapping = (rawHeaders: string[]): ColumnMapping => {
  const fieldIndexes: Record<KnownField, number | undefined> = {} as Record<KnownField, number | undefined>;
  const annotationIndexes: number[] = [];
  const seriesFeitasIndexes: number[] = [];
  let firstAnnotationIndex = -1;

  rawHeaders.forEach((rawHeader, index) => {
    const canonical = transformHeader(rawHeader);

    if (canonical === 'anotacao') {
      annotationIndexes.push(index);
      if (firstAnnotationIndex === -1) {
        firstAnnotationIndex = index;
      }
      return;
    }

    if (canonical === 'series_feitas') {
      seriesFeitasIndexes.push(index);
      return;
    }

    const isKnown = KNOWN_FIELDS.includes(canonical as KnownField);
    if (isKnown && fieldIndexes[canonical as KnownField] === undefined) {
      fieldIndexes[canonical as KnownField] = index;
      return;
    }

    // Google Sheets sometimes splits long notes across empty columns that come
    // after the first "Anotação" header. Treat those columns as part of the note.
    if (firstAnnotationIndex !== -1 && index > firstAnnotationIndex) {
      annotationIndexes.push(index);
    }
  });

  return { fieldIndexes, annotationIndexes, seriesFeitasIndexes };
};

const getCell = (row: string[], index: number | undefined): string => {
  if (index === undefined) {
    return '';
  }
  return (row[index] ?? '').replace(/\r/g, '').trim();
};

export const parseCSV = (input: File | string): Promise<ParsedImportData> => {
  return new Promise((resolve, reject) => {
    let normalizedInput = input;
    if (typeof input === 'string') {
      normalizedInput = stripBom(input)
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
    }

    Papa.parse<string[]>(normalizedInput as any, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data;
          if (rows.length === 0) {
            reject(new Error('The file is empty.'));
            return;
          }

          const rawHeaders = rows[0].map((header) => normalizeHeader(header));
          const { fieldIndexes, annotationIndexes, seriesFeitasIndexes } = buildColumnMapping(rawHeaders);

          const progress: WorkoutProgress = {};
          const annotations: WorkoutAnnotations = {};
          const doneStatus: WorkoutDoneStatus = {};

          const parsedData: WorkoutRaw[] = rows.slice(1).map((row, index) => {
            const week = getCell(row, fieldIndexes.week);
            const exercise = getCell(row, fieldIndexes.exercise);

            if (!week || !exercise) {
              return null;
            }

            const id = `workout_${Date.now()}_${index}`;
            const totalSets = parseInt(getCell(row, fieldIndexes.sets), 10) || 3;

            // "Séries Feitas" can be duplicated (e.g. Google Sheets). Use the first non-empty value.
            const seriesFeitasRaw = seriesFeitasIndexes
              .map((columnIndex) => getCell(row, columnIndex))
              .find((value) => value.length > 0) || '';

            if (seriesFeitasRaw) {
              const parts = seriesFeitasRaw.split('/');
              const completed = parseInt(parts[0], 10) || 0;
              const total = parts.length > 1 ? (parseInt(parts[1], 10) || totalSets) : totalSets;
              const setsArray: boolean[] = Array(total).fill(false);
              for (let i = 0; i < Math.min(completed, total); i++) {
                setsArray[i] = true;
              }
              if (seriesFeitasRaw !== '0' && completed > 0) {
                progress[id] = setsArray;
              }
            }

            // Join annotation fragments spread across extra columns.
            const anotacaoRaw = annotationIndexes
              .map((columnIndex) => getCell(row, columnIndex))
              .filter(Boolean)
              .join(' ');

            if (anotacaoRaw) {
              annotations[id] = anotacaoRaw;
            }

            const concluidoRaw = normalizeHeader(getCell(row, fieldIndexes.concluido));
            const isDoneValue = ['sim', 'yes', 'done', 'true', '1'].includes(concluidoRaw);
            const isSkippedValue = ['pulad', 'pulado', 'skipped', 'undone'].includes(concluidoRaw);
            if (isDoneValue) {
              doneStatus[id] = 'done';
            } else if (isSkippedValue) {
              doneStatus[id] = 'undone';
            }

            return {
              id,
              week: parseInt(week, 10) || 1,
              day: getCell(row, fieldIndexes.day) || 'A',
              focus: getCell(row, fieldIndexes.focus) || 'General',
              exercise: exercise || 'Unknown Exercise',
              total_sets: totalSets,
              reps: getCell(row, fieldIndexes.reps) || '-',
              prep: getCell(row, fieldIndexes.prep) || '-',
              load_pct: getCell(row, fieldIndexes.load_pct) || '-',
              load_kg: getCell(row, fieldIndexes.load_kg) || '-',
              load_unit: normalizeLoadUnit(getCell(row, fieldIndexes.load_unit)),
              load_unit_selected: fieldIndexes.load_unit_selected !== undefined
                ? normalizeLoadUnit(getCell(row, fieldIndexes.load_unit_selected))
                : undefined,
              rpe: getCell(row, fieldIndexes.rpe) || '-',
              rest: getCell(row, fieldIndexes.rest) || '-',
            };
          }).filter((item): item is WorkoutRaw => item !== null);

          resolve({ workouts: parsedData, progress, annotations, doneStatus });
        } catch (err) {
          reject(err);
        }
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
};
