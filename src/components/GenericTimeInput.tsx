import {
  clockTimeFromMinutes,
  dayIndexFromMinutes,
  dayLabel,
  MINUTES_PER_DAY,
  scheduleTimeFromDayAndClock,
  snapScheduleTime
} from '../lib/timelineUtils';
import type { ScheduleTime } from '../types/schedule';

interface GenericTimeInputProps {
  label: string;
  value: ScheduleTime;
  snapMinutes: number;
  onChange: (value: ScheduleTime) => void;
  className?: string;
  hideLabel?: boolean;
}

function dayOptionsFor(value: ScheduleTime): number[] {
  const currentDay = dayIndexFromMinutes(value);
  const minDay = Math.min(0, currentDay);
  const maxDay = Math.max(2, currentDay);
  const options: number[] = [];

  for (let day = minDay; day <= maxDay; day += 1) {
    options.push(day);
  }

  return options;
}

export function GenericTimeInput({
  label,
  value,
  snapMinutes,
  onChange,
  className = '',
  hideLabel = false
}: GenericTimeInputProps) {
  const dayIndex = dayIndexFromMinutes(value);
  const clockValue = clockTimeFromMinutes(value);

  function updateDay(nextDayIndex: number) {
    const clockMinutes = ((value % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    onChange(snapScheduleTime(nextDayIndex * MINUTES_PER_DAY + clockMinutes, snapMinutes));
  }

  function updateClock(nextClock: string) {
    const nextValue = scheduleTimeFromDayAndClock(dayIndex, nextClock);

    if (nextValue != null) {
      onChange(snapScheduleTime(nextValue, snapMinutes));
    }
  }

  return (
    <label className={`block text-sm font-medium text-slate-700 ${className}`}>
      <span className={hideLabel ? 'sr-only' : ''}>{label}</span>
      <span className="mt-1 grid grid-cols-[minmax(92px,0.45fr)_minmax(112px,0.55fr)] gap-2">
        <select
          value={dayIndex}
          onChange={event => updateDay(Number(event.target.value))}
          className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950"
        >
          {dayOptionsFor(value).map(day => (
            <option key={day} value={day}>
              {dayLabel(day * MINUTES_PER_DAY)}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={clockValue}
          onChange={event => updateClock(event.target.value)}
          className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950"
        />
      </span>
    </label>
  );
}
