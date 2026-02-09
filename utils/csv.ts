import Papa from 'papaparse';
import { CSVRow, WorkoutRaw } from '../types';

const transformHeader = (header: string): string => {
  const h = header.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (h.includes('semana')) return 'week';
  if (h === 'dia') return 'day';
  if (h.includes('foco')) return 'focus';
  if (h.includes('exercicio')) return 'exercise';
  if (h.includes('serie')) return 'sets';
  if (h.includes('repeticoe') || h.includes('repeti')) return 'reps';
  if (h.includes('carga') && h.includes('%')) return 'load_pct';
  if (h.includes('carga')) return 'load_kg';
  if (h.includes('rpe')) return 'rpe';
  if (h.includes('descanso')) return 'rest';

  return h.replace(/\s+/g, '_');
};

export const parseCSV = (input: File | string): Promise<WorkoutRaw[]> => {
  return new Promise((resolve, reject) => {
    let normalizedInput = input;
    if (typeof input === 'string') {
      normalizedInput = input
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
          const parsedData: WorkoutRaw[] = results.data.map((row, index) => {
            if (!row.week || !row.exercise) {
              return null;
            }

            return {
              id: `workout_${Date.now()}_${index}`,
              week: parseInt(row.week, 10) || 1,
              day: row.day?.trim() || 'A',
              focus: row.focus?.trim() || 'General',
              exercise: row.exercise?.trim() || 'Unknown Exercise',
              total_sets: parseInt(row.sets, 10) || 3,
              reps: row.reps?.trim() || '-',
              load_pct: row.load_pct?.trim() || '-',
              load_kg: row.load_kg?.trim() || '-',
              rpe: row.rpe?.trim() || '-',
              rest: row.rest?.trim() || '-',
            };
          }).filter((item): item is WorkoutRaw => item !== null);

          resolve(parsedData);
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
