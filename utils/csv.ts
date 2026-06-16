import Papa from 'papaparse';
import { CSVRow, WorkoutRaw, WorkoutProgress, WorkoutAnnotations, WorkoutDoneStatus, ParsedImportData } from '../types';
import { normalizeLoadUnit } from './loadUnit';

const normalizeHeader = (value: string): string => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\-_]/g, ' ')
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

export const parseCSV = (input: File | string): Promise<ParsedImportData> => {
  return new Promise((resolve, reject) => {
    let normalizedInput = input;
    if (typeof input === 'string') {
      normalizedInput = stripBom(input)
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
    }

    Papa.parse<CSVRow>(normalizedInput as any, {
      header: true,
      skipEmptyLines: true,
      transformHeader: transformHeader,
      complete: (results) => {
        try {
          const progress: WorkoutProgress = {};
          const annotations: WorkoutAnnotations = {};
          const doneStatus: WorkoutDoneStatus = {};

          const parsedData: WorkoutRaw[] = results.data.map((row, index) => {
            if (!row.week || !row.exercise) {
              return null;
            }

            const id = `workout_${Date.now()}_${index}`;
            const totalSets = parseInt(row.sets, 10) || 3;

            // Parse "Séries Feitas" column (e.g. "2/3") into boolean[] for progress
            const seriesFeitasRaw = (row.series_feitas || '').trim();
            if (seriesFeitasRaw) {
              const parts = seriesFeitasRaw.split('/');
              const completed = parseInt(parts[0], 10) || 0;
              const total = parts.length > 1 ? (parseInt(parts[1], 10) || totalSets) : totalSets;
              const setsArray: boolean[] = Array(total).fill(false);
              for (let i = 0; i < Math.min(completed, total); i++) {
                setsArray[i] = true;
              }
              // Always store progress if we have series_feitas data, even if all are unchecked
              if (seriesFeitasRaw !== '0' && completed > 0) {
                progress[id] = setsArray;
              }
            }

            // Parse "Anotação" column for annotations
            const anotacaoRaw = (row.anotacao || '').trim();
            if (anotacaoRaw) {
              annotations[id] = anotacaoRaw;
            }

            // Parse "Concluído" / "Status" column for doneStatus
            const concluidoRaw = normalizeHeader(row.concluido || '');
            const isDoneValue = ['sim', 'yes', 'done', 'true', '1'].includes(concluidoRaw);
            const isSkippedValue = ['pulad', 'pulado', 'skipped', 'undone'].includes(concluidoRaw);
            if (isDoneValue) {
              doneStatus[id] = 'done';
            } else if (isSkippedValue) {
              doneStatus[id] = 'undone';
            }

            return {
              id,
              week: parseInt(row.week, 10) || 1,
              day: row.day?.trim() || 'A',
              focus: row.focus?.trim() || 'General',
              exercise: row.exercise?.trim() || 'Unknown Exercise',
              total_sets: totalSets,
              reps: row.reps?.trim() || '-',
              prep: row.prep?.trim() || '-',
              load_pct: row.load_pct?.trim() || '-',
              load_kg: row.load_kg?.trim() || '-',
              load_unit: normalizeLoadUnit(row.load_unit),
              load_unit_selected: row.load_unit_selected ? normalizeLoadUnit(row.load_unit_selected) : undefined,
              rpe: row.rpe?.trim() || '-',
              rest: row.rest?.trim() || '-',
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
