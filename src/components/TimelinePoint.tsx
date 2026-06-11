import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import type { PointerEvent } from 'react';
import type { WarningLevel } from '../types/schedule';

interface TimelinePointProps {
  leftPercent: number;
  label: string;
  timeLabel: string;
  kind: 'feed' | 'final';
  status?: WarningLevel;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
}

export function TimelinePoint({
  leftPercent,
  label,
  timeLabel,
  kind,
  status = 'info',
  onPointerDown
}: TimelinePointProps) {
  const isFinal = kind === 'final';
  const colorClass = isFinal
    ? 'border-emerald-900 bg-emerald-700 text-white'
    : status === 'error'
      ? 'border-red-900 bg-red-700 text-white'
      : status === 'warning'
        ? 'border-amber-700 bg-amber-300 text-slate-950'
        : 'border-slate-900 bg-white text-slate-950';

  const Icon = isFinal ? Clock3 : status === 'info' ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className="pointer-events-none absolute top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
      style={{ left: `${leftPercent}%` }}
    >
      <button
        type="button"
        aria-label={`${label} at ${timeLabel}`}
        onPointerDown={onPointerDown}
        className={`timeline-grab pointer-events-auto flex h-14 min-w-14 items-center justify-center gap-1 rounded-full border-2 px-4 text-sm font-semibold shadow-soft transition hover:scale-105 active:scale-95 sm:h-12 sm:min-w-12 sm:px-3 ${colorClass}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className={isFinal ? 'hidden sm:inline' : ''}>{label}</span>
      </button>
      <span className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm">
        {timeLabel}
      </span>
    </div>
  );
}
