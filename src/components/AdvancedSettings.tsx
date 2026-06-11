import { ChevronDown } from 'lucide-react';
import type { ScheduleSettings } from '../types/schedule';
import { GenericTimeInput } from './GenericTimeInput';

interface AdvancedSettingsProps {
  settings: ScheduleSettings;
  onSettingsChange: (patch: Partial<ScheduleSettings>) => void;
}

function numberValue(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function factorToSliderValue(factor: number): number {
  if (factor >= 1) {
    return Math.round((factor - 1) * 100);
  }

  return Math.round((factor - 1) * 200);
}

function sliderValueToFactor(value: number): number {
  if (value >= 0) {
    return 1 + value / 100;
  }

  return 1 + value / 200;
}

export function AdvancedSettings({ settings, onSettingsChange }: AdvancedSettingsProps) {
  return (
    <details className="rounded-lg border border-slate-200 bg-white shadow-soft print:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-base font-semibold text-slate-950">
        Advanced Configuration
        <ChevronDown className="h-5 w-5 text-slate-600" aria-hidden="true" />
      </summary>

      <div className="space-y-5 border-t border-slate-200 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block text-sm font-medium text-slate-700">
            Hydration %
            <input
              type="number"
              min="1"
              inputMode="decimal"
              value={settings.hydrationPercent}
              onChange={event => onSettingsChange({ hydrationPercent: numberValue(event.target.value, 100) })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Snap minutes
            <input
              type="number"
              min="5"
              step="5"
              inputMode="numeric"
              value={settings.snapMinutes}
              onChange={event => onSettingsChange({ snapMinutes: numberValue(event.target.value, 15) })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Min expansion
            <input
              type="number"
              min="1"
              step="0.1"
              inputMode="decimal"
              value={settings.minExpansionRatio}
              onChange={event => onSettingsChange({ minExpansionRatio: numberValue(event.target.value, 2) })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Max expansion
            <input
              type="number"
              min="1"
              step="0.1"
              inputMode="decimal"
              value={settings.maxExpansionRatio}
              onChange={event => onSettingsChange({ maxExpansionRatio: numberValue(event.target.value, 5) })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block text-sm font-medium text-slate-700">
            Min temp C
            <input
              type="number"
              step="0.5"
              inputMode="decimal"
              value={settings.minTemperature}
              onChange={event => onSettingsChange({ minTemperature: numberValue(event.target.value, 16) })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Max temp C
            <input
              type="number"
              step="0.5"
              inputMode="decimal"
              value={settings.maxTemperature}
              onChange={event => onSettingsChange({ maxTemperature: numberValue(event.target.value, 30) })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Starter speed correction
            <input
              type="range"
              min="-100"
              max="100"
              step="5"
              value={factorToSliderValue(settings.speedCorrection)}
              onChange={event =>
                onSettingsChange({ speedCorrection: sliderValueToFactor(numberValue(event.target.value, 0)) })
              }
              className="mt-2 w-full accent-slate-950"
            />
            <span className="mt-1 grid grid-cols-[1fr_auto_1fr] items-start gap-2 text-xs text-slate-600">
              <span>Slower</span>
              <strong className="text-center text-slate-950">{settings.speedCorrection.toFixed(2)}x</strong>
              <span className="text-right">Faster</span>
            </span>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <GenericTimeInput
            label="Visible start"
            value={settings.timelineStart}
            snapMinutes={settings.snapMinutes}
            onChange={timelineStart => onSettingsChange({ timelineStart })}
          />
          <GenericTimeInput
            label="Visible end"
            value={settings.timelineEnd}
            snapMinutes={settings.snapMinutes}
            onChange={timelineEnd => onSettingsChange({ timelineEnd })}
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-950">Working Hours</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Start
              <input
                type="time"
                value={settings.workingHours.start}
                onChange={event =>
                  onSettingsChange({ workingHours: { ...settings.workingHours, start: event.target.value } })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              End
              <input
                type="time"
                value={settings.workingHours.end}
                onChange={event =>
                  onSettingsChange({ workingHours: { ...settings.workingHours, end: event.target.value } })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950"
              />
            </label>
          </div>
        </div>
      </div>
    </details>
  );
}
