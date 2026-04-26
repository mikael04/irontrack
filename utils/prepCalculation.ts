import { OneRmValues, OneRmMovementId } from '../types';

export interface PrepSet {
  percent: number;
  reps: number;
}

const normalizeText = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
};

const SQUAT_KEYWORDS = ['squat', 'agachamento', 'agachar', 'agach'];
const BENCH_KEYWORDS = ['bench', 'supino', 'press'];
const DEADLIFT_KEYWORDS = ['deadlift', 'levantamento terra', 'levantamento', 'terra', 'stiff', 'dead'];

export const mapExerciseToMovement = (exerciseName: string): OneRmMovementId | null => {
  const normalized = normalizeText(exerciseName);

  if (SQUAT_KEYWORDS.some(kw => normalized.includes(kw))) {
    return 'squat';
  }
  if (BENCH_KEYWORDS.some(kw => normalized.includes(kw))) {
    return 'bench';
  }
  if (DEADLIFT_KEYWORDS.some(kw => normalized.includes(kw))) {
    return 'deadlift';
  }

  return null;
};

export const parsePrepText = (prepText: string): PrepSet[] => {
  const sets: PrepSet[] = [];
  const regex = /(\d+)\s*%\s*×?\s*(\d+)/gi;
  let match;

  while ((match = regex.exec(prepText)) !== null) {
    const percent = parseInt(match[1], 10);
    const reps = parseInt(match[2], 10);
    if (percent > 0 && reps > 0) {
      sets.push({ percent, reps });
    }
  }

  return sets;
};

const parseNumericInput = (raw: string): number | null => {
  if (!raw.trim()) {
    return null;
  }
  const normalized = raw.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatLoadValue = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  const text = rounded.toFixed(2);
  return text.replace(/\.?0+$/, '');
};

export const formatPrepWithWeights = (prepText: string, oneRmValues: OneRmValues, exerciseName: string): string => {
  const movement = mapExerciseToMovement(exerciseName);
  if (!movement) {
    return prepText;
  }

  const oneRm = parseNumericInput(oneRmValues[movement]);
  if (oneRm === null) {
    return prepText;
  }

  const sets = parsePrepText(prepText);
  if (sets.length === 0) {
    return prepText;
  }

  const formattedSets = sets.map(set => {
    const calculatedWeight = (oneRm * set.percent) / 100;
    return `${formatLoadValue(calculatedWeight)}kg x ${set.reps}`;
  });

  return formattedSets.join(', ');
};