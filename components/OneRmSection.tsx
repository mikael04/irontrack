import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OneRmMovementId, OneRmValues } from '../types';

interface OneRmSectionProps {
  values: OneRmValues;
  onChangeValue: (id: OneRmMovementId, value: string) => void;
  expanded: Record<string, boolean>;
  onToggleExpanded: (id: string) => void;
}

interface MovementDefinition {
  id: OneRmMovementId;
  label: string;
}

const MOVEMENTS: MovementDefinition[] = [
  { id: 'squat', label: 'one_rm_squat' },
  { id: 'bench', label: 'one_rm_bench' },
  { id: 'deadlift', label: 'one_rm_deadlift' }
];

const PERCENT_STEPS = [20, 40, 50, 60, 70, 75, 80, 85, 90, 95];

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

const PercentRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gym-400">{label}</span>
    <span className="text-white font-semibold">{value}</span>
  </div>
);

export const OneRmSection: React.FC<OneRmSectionProps> = ({ values, onChangeValue, expanded, onToggleExpanded }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {MOVEMENTS.map((movement) => {
        const rawValue = values[movement.id] ?? '';
        const numericValue = parseNumericInput(rawValue);
        const computedLoads = PERCENT_STEPS.map((percent) => {
          if (numericValue === null) {
            return { percent, display: '-' };
          }
          const computed = (numericValue * percent) / 100;
          return { percent, display: `${formatLoadValue(computed)} kg` };
        });

        return (
          <div
            key={movement.id}
            className="rounded-2xl border border-gym-800 bg-gym-900/70 shadow-lg overflow-hidden"
          >
            <button
              type="button"
              onClick={() => onToggleExpanded(movement.id)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gym-900/80 hover:bg-gym-800/70 transition-colors"
            >
              <div>
                <h3 className="text-white font-bold">{t(movement.label)}</h3>
                <p className="text-xs text-gym-500">{t('one_rm_label')}</p>
              </div>
              <ChevronDown
                size={18}
                className={`text-gym-400 transition-transform ${expanded[movement.id] ? 'rotate-180' : ''}`}
              />
            </button>

            <div className="px-4 pb-4">
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gym-400 text-sm">{t('one_rm_percent_100')}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.5"
                      className="w-28 bg-gym-800 border border-gym-700 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gym-accent"
                      placeholder="0"
                      value={rawValue}
                      onChange={(event) => onChangeValue(movement.id, event.target.value)}
                    />
                    <select
                      value="kg"
                      className="bg-gym-800 border border-gym-700 rounded-lg px-2 py-1 text-sm text-gym-200"
                    >
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>

                {expanded[movement.id] && (
                  <div className="space-y-2 pt-2 border-t border-gym-800">
                    {computedLoads.map((item) => (
                      <PercentRow
                        key={item.percent}
                        label={`${item.percent}%`}
                        value={item.display}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
