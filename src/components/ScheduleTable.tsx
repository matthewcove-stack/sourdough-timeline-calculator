import { Clock3, Copy, Plus, Printer, RotateCcw, Share2, Thermometer, Trash2, Wheat } from 'lucide-react';
import { celsius, formatDuration, formatScheduleTime, grams, ratio, roundTo } from '../lib/formatting';
import type { ExpansionPoint, SchedulePlan, ScheduleSettings } from '../types/schedule';
import { GenericTimeInput } from './GenericTimeInput';

interface ScheduleTableProps {
  settings: ScheduleSettings;
  plan: SchedulePlan;
  onCopy: () => void;
  copyStatus: string;
  actionStatus: string;
  onAddFeed: () => void;
  onPointChange: (pointId: string, patch: Partial<ExpansionPoint>) => void;
  onPointRemove: (pointId: string) => void;
  onResetRatios: () => void;
  onShare: () => void;
  onPrint: () => void;
}

function numberValue(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function ScheduleTable({
  settings,
  plan,
  onCopy,
  copyStatus,
  actionStatus,
  onAddFeed,
  onPointChange,
  onPointRemove,
  onResetRatios,
  onShare,
  onPrint
}: ScheduleTableProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Feeding Schedule</h2>
          {plan.idealRatio && (
            <p className="text-sm text-slate-600">Even baseline: {ratio(plan.idealRatio)} per feed</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={onAddFeed}
            className="flex h-11 shrink-0 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add feed
          </button>
          <button
            type="button"
            onClick={onResetRatios}
            className="flex h-11 shrink-0 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-800"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Balance ratios
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="flex h-11 shrink-0 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-800"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copy
          </button>
          <button
            type="button"
            onClick={onShare}
            className="flex h-11 shrink-0 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-800"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="flex h-11 shrink-0 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-800"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print
          </button>
        </div>
      </div>

      {copyStatus && <p className="mb-3 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700 print:hidden">{copyStatus}</p>}
      {actionStatus && <p className="mb-3 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700 print:hidden">{actionStatus}</p>}

      {plan.stages.length === 0 ? (
        <p className="rounded-md bg-slate-100 px-4 py-5 text-sm text-slate-700">
          Add a feed to generate a feeding plan.
        </p>
      ) : (
        <div className="space-y-3">
          {plan.stages.map(stage => {
            const stageWarnings = plan.warnings.filter(warning => warning.id.includes(stage.id));

            return (
            <article
              key={stage.id}
              className={`break-inside-avoid rounded-lg border p-3 sm:p-4 ${
                stage.status === 'error'
                  ? 'border-red-200 bg-red-50'
                  : stage.status === 'warning'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-slate-200 bg-white'
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">Feed {stage.feedNumber}</h3>
                  <p className="flex items-center gap-1 text-sm text-slate-600">
                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                    {formatScheduleTime(stage.point.time)}
                  </p>
                </div>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-sm font-semibold text-white">
                  {ratio(stage.expansionRatio)}
                </span>
              </div>

              {stageWarnings.length > 0 && (
                <div className="mb-3 space-y-2">
                  {stageWarnings.map(warning => (
                    <p
                      key={warning.id}
                      className={`rounded-md px-3 py-2 text-sm ${
                        warning.level === 'error'
                          ? 'bg-red-100 text-red-950'
                          : 'bg-amber-100 text-amber-950'
                      }`}
                    >
                      {warning.message}
                    </p>
                  ))}
                </div>
              )}

              <p className="mb-4 rounded-md bg-slate-100 p-3 text-sm leading-6 text-slate-900">
                At <strong>{formatScheduleTime(stage.point.time)}</strong>, use{' '}
                <strong>{grams(stage.starterBefore)}</strong> starter. Add{' '}
                <strong>{grams(stage.additions.flourAdded)}</strong> flour and{' '}
                <strong>{grams(stage.additions.waterAdded)}</strong> water. Total after feeding:{' '}
                <strong>{grams(stage.targetAfter)}</strong>.
              </p>

              <div className="mb-3 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_160px_auto] sm:items-end print:hidden">
                <GenericTimeInput
                  label="Feed time"
                  value={stage.point.time}
                  snapMinutes={settings.snapMinutes}
                  onChange={time => onPointChange(stage.id, { time })}
                />
                <label className="block text-sm font-medium text-slate-700">
                  Multiplier
                  <input
                    type="number"
                    min="1.01"
                    step="0.05"
                    inputMode="decimal"
                    value={roundTo(stage.expansionRatio, 2)}
                    onChange={event =>
                      onPointChange(stage.id, {
                        lockedExpansionRatio: numberValue(event.target.value, stage.expansionRatio)
                      })
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onPointRemove(stage.id)}
                  className="flex h-11 items-center justify-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Remove
                </button>
              </div>

              {stage.point.lockedExpansionRatio != null && (
                <button
                  type="button"
                  onClick={() => onPointChange(stage.id, { lockedExpansionRatio: null })}
                  className="mb-4 h-10 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 print:hidden"
                >
                  Auto-balance this multiplier
                </button>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-slate-100 p-3">
                  <span className="flex items-center gap-1 text-slate-600">
                    <Wheat className="h-4 w-4" aria-hidden="true" />
                    Hydration
                  </span>
                  <strong className="mt-1 block text-slate-950">{stage.hydrationPercent}%</strong>
                </div>
                <div className="rounded-md bg-slate-100 p-3">
                  <span className="flex items-center gap-1 text-slate-600">
                    <Thermometer className="h-4 w-4" aria-hidden="true" />
                    Mix / hold
                  </span>
                  <strong className="mt-1 block text-slate-950">
                    {celsius(stage.segment.suggestedTemperature)}
                  </strong>
                </div>
                <div className="col-span-2 rounded-md bg-slate-100 p-3">
                  <span className="text-slate-600">Until {formatScheduleTime(stage.segment.endTime)}</span>
                  <strong className="mt-1 block text-slate-950">{formatDuration(stage.segment.durationHours)}</strong>
                </div>
              </div>

              <details className="mt-3 rounded-md border border-slate-200 bg-white print:hidden">
                <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-slate-800">
                  Notes
                </summary>
                <label className="block border-t border-slate-200 p-3 text-sm font-medium text-slate-700">
                  Notes
                  <textarea
                    rows={2}
                    value={stage.point.notes ?? ''}
                    onChange={event => onPointChange(stage.id, { notes: event.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950"
                  />
                </label>
              </details>
            </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
