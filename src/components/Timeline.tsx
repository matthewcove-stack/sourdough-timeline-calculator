import { Maximize2, Plus, SkipBack, SkipForward } from 'lucide-react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import { celsius, formatDuration, formatScheduleTime, formatTime } from '../lib/formatting';
import {
  clamp,
  getWorkingHourBands,
  HOUR_MINUTES,
  positionPercent,
  snapScheduleTime
} from '../lib/timelineUtils';
import type { ExpansionPoint, SchedulePlan, ScheduleSettings, ScheduleTime } from '../types/schedule';
import { TimelinePoint } from './TimelinePoint';

interface TimelineProps {
  settings: ScheduleSettings;
  points: ExpansionPoint[];
  plan: SchedulePlan;
  onPointTimeChange: (pointId: string, time: ScheduleTime) => void;
  onFinalTimeChange: (time: ScheduleTime) => void;
  onTimelineRangeChange: (start: ScheduleTime, end: ScheduleTime) => void;
  onAddPointAt: (time: ScheduleTime) => void;
  onFitView: () => void;
}

type DragState =
  | {
      kind: 'point';
      pointId: string;
    }
  | {
      kind: 'final';
    }
  | {
      kind: 'pan';
      startX: number;
      startStart: number;
      startEnd: number;
    };

export function Timeline({
  settings,
  points,
  plan,
  onPointTimeChange,
  onFinalTimeChange,
  onTimelineRangeChange,
  onAddPointAt,
  onFitView
}: TimelineProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const bands = useMemo(
    () => getWorkingHourBands(settings.timelineStart, settings.timelineEnd, settings.workingHours),
    [settings.timelineStart, settings.timelineEnd, settings.workingHours]
  );

  const start = settings.timelineStart;
  const end = settings.timelineEnd;
  const range = Math.max(1, end - start);

  function timeFromClientX(clientX: number): ScheduleTime {
    const rect = railRef.current?.getBoundingClientRect();
    if (!rect) {
      return start;
    }

    const percent = clamp((clientX - rect.left) / rect.width, 0, 1);
    return snapScheduleTime(start + range * percent, settings.snapMinutes);
  }

  function beginPointDrag(pointId: string, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({ kind: 'point', pointId });
  }

  function beginFinalDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({ kind: 'final' });
  }

  function beginPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      kind: 'pan',
      startX: event.clientX,
      startStart: start,
      startEnd: end
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState || !railRef.current) {
      return;
    }

    if (dragState.kind === 'point') {
      onPointTimeChange(dragState.pointId, timeFromClientX(event.clientX));
      return;
    }

    if (dragState.kind === 'final') {
      onFinalTimeChange(timeFromClientX(event.clientX));
      return;
    }

    const rect = railRef.current.getBoundingClientRect();
    const delta = -((event.clientX - dragState.startX) / rect.width) * range;
    const nextStart = Math.max(0, snapScheduleTime(dragState.startStart + delta, settings.snapMinutes));
    const nextEnd = snapScheduleTime(dragState.startEnd + delta, settings.snapMinutes);
    onTimelineRangeChange(nextStart, Math.max(nextStart + 1, nextEnd));
  }

  function handlePointerEnd() {
    setDragState(null);
  }

  function nudgeRange(hours: number) {
    const delta = hours * HOUR_MINUTES;
    const nextStart = Math.max(0, start + delta);
    onTimelineRangeChange(nextStart, nextStart + range);
  }

  function addAtTap(event: ReactMouseEvent<HTMLDivElement>) {
    if (dragState || event.detail !== 2) {
      return;
    }

    onAddPointAt(timeFromClientX(event.clientX));
  }

  function addAtCenter() {
    onAddPointAt(snapScheduleTime(start + range / 2, settings.snapMinutes));
  }

  const finalLeft = positionPercent(settings.finalReadyAt, settings.timelineStart, settings.timelineEnd);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft print:hidden">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Timeline</h2>
          <p className="text-sm text-slate-600">Approximate fermentation model</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addAtCenter}
            className="flex h-11 items-center gap-1 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add feed
          </button>
          <button
            type="button"
            onClick={onFitView}
            className="flex h-11 items-center gap-1 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-800"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
            Fit view
          </button>
          <button
            type="button"
            onClick={() => nudgeRange(-2)}
            className="flex h-11 items-center gap-1 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-800"
          >
            <SkipBack className="h-4 w-4" aria-hidden="true" />
            Back 2h
          </button>
          <button
            type="button"
            onClick={() => nudgeRange(2)}
            className="flex h-11 items-center gap-1 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-800"
          >
            Forward 2h
            <SkipForward className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        className="timeline-grab relative h-44 overflow-hidden rounded-lg border border-slate-300 bg-slate-50"
        onPointerDown={beginPan}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onDoubleClick={addAtTap}
      >
        {bands.map(band => {
          const left = positionPercent(band.startTime, settings.timelineStart, settings.timelineEnd);
          const width =
            positionPercent(band.endTime, settings.timelineStart, settings.timelineEnd) -
            positionPercent(band.startTime, settings.timelineStart, settings.timelineEnd);

          return (
            <div
              key={band.id}
              className={`absolute inset-y-0 ${
                band.kind === 'working'
                  ? 'bg-emerald-50'
                  : 'bg-slate-800/15'
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              {width >= 18 && (
                <span
                  className={`absolute bottom-1 left-2 whitespace-nowrap rounded px-2 py-1 text-[11px] font-semibold ${
                    band.kind === 'working'
                      ? 'bg-emerald-100 text-emerald-950'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {band.kind === 'working' ? 'Working' : 'Outside hours'}
                </span>
              )}
            </div>
          );
        })}

        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-slate-900/65" />

        {plan.segments.map(segment => {
          const left = positionPercent(segment.startTime, settings.timelineStart, settings.timelineEnd);
          const right = positionPercent(segment.endTime, settings.timelineStart, settings.timelineEnd);
          const center = (left + right) / 2;
          const width = Math.max(10, right - left);

          return (
            <div
              key={segment.id}
              className={`absolute top-4 z-10 -translate-x-1/2 rounded-md px-2 py-1 text-center text-[11px] font-semibold shadow-sm ${
                segment.temperatureInPracticalRange
                  ? 'bg-white/90 text-slate-800'
                  : 'bg-amber-100 text-amber-950'
              }`}
              style={{ left: `${center}%`, maxWidth: `${width}%` }}
            >
              {celsius(segment.suggestedTemperature)}
              <span className="block font-medium text-slate-600">{formatDuration(segment.durationHours)}</span>
            </div>
          );
        })}

        {plan.stages.map(stage => (
          <TimelinePoint
            key={stage.id}
            leftPercent={positionPercent(stage.point.time, settings.timelineStart, settings.timelineEnd)}
            label={`F${stage.feedNumber}`}
            timeLabel={formatTime(stage.point.time)}
            kind="feed"
            status={stage.status}
            onPointerDown={event => beginPointDrag(stage.id, event)}
          />
        ))}

        <TimelinePoint
          leftPercent={finalLeft}
          label="Ready"
          timeLabel={formatTime(settings.finalReadyAt)}
          kind="final"
          onPointerDown={beginFinalDrag}
        />

        <div className="pointer-events-none absolute bottom-9 left-2 rounded bg-white/90 px-2 py-1 text-xs font-medium text-slate-700">
          {formatScheduleTime(settings.timelineStart)}
        </div>
        <div className="pointer-events-none absolute bottom-9 right-2 rounded bg-white/90 px-2 py-1 text-xs font-medium text-slate-700">
          {formatScheduleTime(settings.timelineEnd)}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium text-slate-600">
        <span className="flex items-center gap-1">
          <span className="h-3 w-6 rounded bg-sky-100 ring-1 ring-sky-200" aria-hidden="true" />
          Working hours
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-6 rounded bg-slate-800/20 ring-1 ring-slate-300" aria-hidden="true" />
          Outside working hours
        </span>
      </div>
    </section>
  );
}
