import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { celsius, formatScheduleTime, ratio } from '../lib/formatting';
import type { SchedulePlan, ScheduleSettings } from '../types/schedule';

interface PlanSummaryProps {
  settings: ScheduleSettings;
  plan: SchedulePlan;
  setupError: string;
}

function planStatus(settings: ScheduleSettings, plan: SchedulePlan, setupError: string) {
  const hasError = plan.warnings.some(warning => warning.level === 'error');
  const hotStage = plan.stages.find(stage => stage.segment.suggestedTemperature > settings.maxTemperature);
  const coldStage = plan.stages.find(stage => stage.segment.suggestedTemperature < settings.minTemperature);
  const highExpansion = plan.stages.find(stage => stage.expansionRatio > settings.maxExpansionRatio);
  const lowExpansion = plan.stages.find(stage => stage.expansionRatio < settings.minExpansionRatio);
  const hasWarning = plan.warnings.some(warning => warning.level === 'warning');

  if (setupError || hasError) {
    return {
      label: 'Check plan',
      className: 'border-red-200 bg-red-50 text-red-950',
      Icon: XCircle
    };
  }

  if (highExpansion) {
    return {
      label: 'Too much expansion',
      className: 'border-amber-200 bg-amber-50 text-amber-950',
      Icon: AlertTriangle
    };
  }

  if (lowExpansion) {
    return {
      label: 'Low expansion',
      className: 'border-amber-200 bg-amber-50 text-amber-950',
      Icon: AlertTriangle
    };
  }

  if (hotStage) {
    return {
      label: 'Needs warmer target temp',
      className: 'border-amber-200 bg-amber-50 text-amber-950',
      Icon: AlertTriangle
    };
  }

  if (coldStage) {
    return {
      label: 'Needs cooler target temp',
      className: 'border-amber-200 bg-amber-50 text-amber-950',
      Icon: AlertTriangle
    };
  }

  if (hasWarning) {
    return {
      label: 'Review plan',
      className: 'border-amber-200 bg-amber-50 text-amber-950',
      Icon: AlertTriangle
    };
  }

  return {
    label: 'Good plan',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    Icon: CheckCircle2
  };
}

function feedTimes(plan: SchedulePlan): string {
  if (plan.stages.length === 0) {
    return 'No feeds yet';
  }

  return plan.stages.map(stage => formatScheduleTime(stage.point.time)).join(', ');
}

export function PlanSummary({ settings, plan, setupError }: PlanSummaryProps) {
  const status = planStatus(settings, plan, setupError);
  const StatusIcon = status.Icon;
  const firstStage = plan.stages[0];

  return (
    <section className={`rounded-lg border px-4 py-3 shadow-soft ${status.className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <StatusIcon className="h-4 w-4" aria-hidden="true" />
            {status.label}
          </p>
          <p className="mt-1 text-sm leading-6">
            Feed at <strong>{feedTimes(plan)}</strong>. Ready by{' '}
            <strong>{formatScheduleTime(settings.finalReadyAt)}</strong>.
          </p>
          {setupError && <p className="mt-2 text-sm font-medium">{setupError}</p>}
        </div>

        {plan.idealRatio && (
          <div className="rounded-md bg-white/70 px-3 py-2 text-sm text-slate-800">
            <span className="block text-xs font-medium text-slate-600">Baseline</span>
            <strong>{ratio(plan.idealRatio)}</strong> per feed
          </div>
        )}
      </div>

      <details className="mt-3 rounded-md border border-black/10 bg-white/60">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-semibold">
          <Info className="h-4 w-4" aria-hidden="true" />
          Why this plan?
        </summary>
        <div className="space-y-2 border-t border-black/10 px-3 py-3 text-sm leading-6 text-slate-800">
          <p>
            The calculator splits the growth from {settings.initialAmount}g to {settings.finalAmount}g across the
            current feeds, then estimates the target temperature for each stage.
          </p>
          <p>
            Generated feed times are moved into your working hours where possible. Each target temperature assumes the
            starter is mixed to that temperature and held there for the stage.
          </p>
          <p>
            The fermentation estimate uses a simple 21C reference curve, adjusted by the starter speed correction. It
            does not yet calculate water temperature or thermal lag from cold flour, starter, or room conditions.
          </p>
          {firstStage && (
            <p>
              First feed target: {ratio(firstStage.expansionRatio)} expansion, mixed and held at about{' '}
              {celsius(firstStage.segment.suggestedTemperature)}.
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
