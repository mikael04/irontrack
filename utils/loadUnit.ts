import { LoadUnit } from '../types';

const normalizeText = (value?: string | null): string => {
  return (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\.\-_/]/g, ' ')
    .toLowerCase()
    .trim();
};

const LOAD_UNIT_ALIASES: Record<string, LoadUnit> = {
  kg: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  kilograma: 'kg',
  kilogramas: 'kg',
  bar: 'bar',
  bars: 'bar',
  barr: 'bar',
  barras: 'bar',
  dumb: 'dumb',
  dumbbell: 'dumb',
  dumbbells: 'dumb',
  halter: 'dumb',
  halteres: 'dumb',
  halt: 'dumb',
};

export const normalizeLoadUnit = (value?: string | null): LoadUnit => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return 'kg';
  }

  const directMatch = LOAD_UNIT_ALIASES[normalized];
  if (directMatch) {
    return directMatch;
  }

  const tokens = normalized.split(/\s+/);
  for (const token of tokens) {
    const tokenMatch = LOAD_UNIT_ALIASES[token];
    if (tokenMatch) {
      return tokenMatch;
    }
  }

  return 'kg';
};

export const formatLoadUnitForExport = (unit: LoadUnit): string => {
  switch (unit) {
    case 'bar':
      return 'bar.';
    case 'dumb':
      return 'halt.';
    default:
      return 'kg';
  }
};
