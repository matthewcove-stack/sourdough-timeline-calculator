import { RotateCcw, Wand2 } from 'lucide-react';
import type { ScheduleSettings } from '../types/schedule';
import { GenericTimeInput } from './GenericTimeInput';

interface QuickSetupProps {
  settings: ScheduleSettings;
  onSettingsChange: (patch: Partial<ScheduleSettings>) => void;
  onFitPlan: () => void;
  onReset: () => void;
  onApplyPreset: (presetId: string) => void;
  savedDefaultsApplied: boolean;
  setupError: string;
}

const presets = [
  { id: 'weekday', label: 'Weekday bake' },
  { id: 'overnight', label: 'Overnight bake' },
  { id: 'warm', label: 'Warm kitchen' },
  { id: 'slow', label: 'Slow starter' }
];

function numberValue(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function QuickSetup({
  settings,
  onSettingsChange,
  onFitPlan,
  onReset,
  onApplyPreset,
  savedDefaultsApplied,
  setupError
}: QuickSetupProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft print:hidden">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Start Here</h2>
          {savedDefaultsApplied && <p className="text-sm text-emerald-800">Using your saved defaults.</p>}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex h-11 shrink-0 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-800"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset plan
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-1 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
              1
            </span>
            Initial starter (g)
          </span>
          <input
            type="number"
            min="1"
            inputMode="decimal"
            value={settings.initialAmount}
            onChange={event => onSettingsChange({ initialAmount: numberValue(event.target.value, 0) })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-1 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
              2
            </span>
            Final starter (g)
          </span>
          <input
            type="number"
            min="1"
            inputMode="decimal"
            value={settings.finalAmount}
            onChange={event => onSettingsChange({ finalAmount: numberValue(event.target.value, 0) })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950"
          />
        </label>
        <div className="block text-sm font-medium text-slate-700">
          <span className="mb-1 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
              3
            </span>
            Ready by
          </span>
          <GenericTimeInput
            label="Ready by"
            hideLabel
            value={settings.finalReadyAt}
            snapMinutes={settings.snapMinutes}
            onChange={finalReadyAt => onSettingsChange({ finalReadyAt })}
          />
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold text-slate-800">Presets</p>
        <div className="flex flex-wrap gap-2">
          {presets.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset.id)}
              className="h-10 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-800"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {setupError && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-900">{setupError}</p>}

      <button
        type="button"
        onClick={onFitPlan}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white sm:w-auto"
      >
        <Wand2 className="h-4 w-4" aria-hidden="true" />
        Generate feeding plan
      </button>
    </section>
  );
}
