import { AlertTriangle, Info, XCircle } from 'lucide-react';
import type { ScheduleWarning } from '../types/schedule';

interface WarningListProps {
  warnings: ScheduleWarning[];
}

export function WarningList({ warnings }: WarningListProps) {
  if (warnings.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 print:hidden">
        No schedule warnings.
      </div>
    );
  }

  return (
    <section className="space-y-2 print:hidden" aria-label="Schedule warnings">
      {warnings.map(warning => {
        const Icon = warning.level === 'error' ? XCircle : warning.level === 'warning' ? AlertTriangle : Info;
        const className =
          warning.level === 'error'
            ? 'border-red-200 bg-red-50 text-red-950'
            : warning.level === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-950'
              : 'border-sky-200 bg-sky-50 text-sky-950';

        return (
          <div key={warning.id} className={`flex gap-2 rounded-lg border px-4 py-3 text-sm ${className}`}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{warning.message}</p>
          </div>
        );
      })}
    </section>
  );
}
