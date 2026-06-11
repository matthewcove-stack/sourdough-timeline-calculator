import type { ExpansionPoint, ScheduleTime, TimelineBand, TimelineBandKind, WorkingHours } from '../types/schedule';

export const MINUTES_PER_DAY = 24 * 60;
export const HOUR_MINUTES = 60;
export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = HOUR_MINUTES * MINUTE_MS;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function defaultWorkingHours(): WorkingHours {
  return {
    start: '06:00',
    end: '20:00'
  };
}

export function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return Number.NaN;
  }

  return hours * HOUR_MINUTES + minutes;
}

export function clockTimeFromMinutes(value: ScheduleTime): string {
  const minutesInDay = ((Math.round(value) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(minutesInDay / HOUR_MINUTES);
  const minutes = minutesInDay % HOUR_MINUTES;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function dayIndexFromMinutes(value: ScheduleTime): number {
  return Math.floor(value / MINUTES_PER_DAY);
}

export function dayLabel(value: ScheduleTime): string {
  const dayIndex = dayIndexFromMinutes(value);

  if (dayIndex >= 0) {
    return `Day ${dayIndex + 1}`;
  }

  return `${Math.abs(dayIndex)} day before`;
}

export function formatScheduleTime(value: ScheduleTime): string {
  return `${dayLabel(value)} ${clockTimeFromMinutes(value)}`;
}

export function scheduleTimeFromDayAndClock(dayIndex: number, clockTime: string): ScheduleTime | null {
  const clockMinutes = minutesFromTime(clockTime);

  if (!Number.isFinite(clockMinutes) || !Number.isInteger(dayIndex)) {
    return null;
  }

  return dayIndex * MINUTES_PER_DAY + clockMinutes;
}

export function snapScheduleTime(value: ScheduleTime, incrementMinutes: number): ScheduleTime {
  const increment = Math.max(1, incrementMinutes);
  return Math.round(value / increment) * increment;
}

export function addMinutes(value: ScheduleTime, minutes: number): ScheduleTime {
  return value + minutes;
}

export function durationHours(startTime: ScheduleTime, endTime: ScheduleTime): number {
  return (endTime - startTime) / HOUR_MINUTES;
}

export function positionPercent(time: ScheduleTime, startTime: ScheduleTime, endTime: ScheduleTime): number {
  if (endTime <= startTime) {
    return 0;
  }

  return clamp(((time - startTime) / (endTime - startTime)) * 100, 0, 100);
}

function workingDurationMinutes(workingHours: WorkingHours): number {
  const start = minutesFromTime(workingHours.start);
  const end = minutesFromTime(workingHours.end);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 14 * HOUR_MINUTES;
  }

  if (start === end) {
    return MINUTES_PER_DAY;
  }

  return start < end ? end - start : MINUTES_PER_DAY - start + end;
}

function workingEndForStart(startMinutes: ScheduleTime, workingHours: WorkingHours): ScheduleTime {
  return startMinutes + workingDurationMinutes(workingHours);
}

export interface WorkingInterval {
  start: ScheduleTime;
  end: ScheduleTime;
}

export interface DefaultTimelineRange {
  timelineStart: ScheduleTime;
  timelineEnd: ScheduleTime;
  firstWorkingStart: ScheduleTime;
  firstWorkingEnd: ScheduleTime;
  secondWorkingStart: ScheduleTime;
  secondWorkingEnd: ScheduleTime;
}

export function isWithinWorkingHours(value: ScheduleTime, workingHours: WorkingHours): boolean {
  const minutes = ((Math.round(value) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const start = minutesFromTime(workingHours.start);
  const end = minutesFromTime(workingHours.end);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return false;
  }

  if (start === end) {
    return true;
  }

  if (start < end) {
    return minutes >= start && minutes < end;
  }

  return minutes >= start || minutes < end;
}

export function getDefaultTimelineRange(workingHours: WorkingHours): DefaultTimelineRange {
  const startMinutes = minutesFromTime(workingHours.start);
  const firstWorkingStart = Number.isFinite(startMinutes) ? startMinutes : minutesFromTime(defaultWorkingHours().start);
  const firstWorkingEnd = workingEndForStart(firstWorkingStart, workingHours);
  const secondWorkingStart = firstWorkingStart + MINUTES_PER_DAY;
  const secondWorkingEnd = workingEndForStart(secondWorkingStart, workingHours);
  const timelineEnd = secondWorkingStart + Math.round((secondWorkingEnd - secondWorkingStart) / 2);

  return {
    timelineStart: firstWorkingStart,
    timelineEnd,
    firstWorkingStart,
    firstWorkingEnd,
    secondWorkingStart,
    secondWorkingEnd
  };
}

function nextWorkingBoundary(value: ScheduleTime, workingHours: WorkingHours): ScheduleTime {
  const start = minutesFromTime(workingHours.start);
  const end = minutesFromTime(workingHours.end);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return value + HOUR_MINUTES;
  }

  if (start === end) {
    return value + MINUTES_PER_DAY;
  }

  const currentDay = Math.floor(value / MINUTES_PER_DAY);
  const candidates: ScheduleTime[] = [];

  for (let dayOffset = -1; dayOffset <= 3; dayOffset += 1) {
    const dayStart = (currentDay + dayOffset) * MINUTES_PER_DAY;
    candidates.push(dayStart + start, dayStart + end);
  }

  return candidates
    .filter(candidate => candidate > value)
    .sort((left, right) => left - right)[0] ?? value + HOUR_MINUTES;
}

export function getWorkingHourBands(
  startTime: ScheduleTime,
  endTime: ScheduleTime,
  workingHours: WorkingHours
): TimelineBand[] {
  if (endTime <= startTime) {
    return [];
  }

  const bands: TimelineBand[] = [];
  let cursor = startTime;

  while (cursor < endTime) {
    const boundary = nextWorkingBoundary(cursor, workingHours);
    const segmentEnd = boundary < endTime ? boundary : endTime;
    const kind: TimelineBandKind = isWithinWorkingHours(cursor, workingHours) ? 'working' : 'nonWorking';

    bands.push({
      id: `${kind}-${cursor}-${segmentEnd}`,
      kind,
      startTime: cursor,
      endTime: segmentEnd
    });

    cursor = segmentEnd;
  }

  return bands;
}

export function moveToPreviousWorkingTime(
  value: ScheduleTime,
  workingHours: WorkingHours,
  incrementMinutes: number
): ScheduleTime {
  let cursor = snapScheduleTime(value, incrementMinutes);
  const step = Math.max(5, incrementMinutes);
  const maxSteps = Math.ceil((14 * MINUTES_PER_DAY) / step);

  for (let index = 0; index < maxSteps; index += 1) {
    if (isWithinWorkingHours(cursor, workingHours)) {
      return cursor;
    }

    cursor -= step;
  }

  return snapScheduleTime(value, incrementMinutes);
}

export function legacyDateTimeToScheduleTime(value: string, baseValue?: string): ScheduleTime | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  const baseMatch = baseValue?.match(/^(\d{4})-(\d{2})-(\d{2})T/);

  if (!match) {
    return null;
  }

  const [, year, month, day, hours, minutes] = match.map(Number);
  const baseYear = baseMatch ? Number(baseMatch[1]) : year;
  const baseMonth = baseMatch ? Number(baseMatch[2]) : month;
  const baseDay = baseMatch ? Number(baseMatch[3]) : day;
  const currentDate = Date.UTC(year, month - 1, day);
  const baseDate = Date.UTC(baseYear, baseMonth - 1, baseDay);
  const dayOffset = Math.round((currentDate - baseDate) / (MINUTES_PER_DAY * MINUTE_MS));

  return dayOffset * MINUTES_PER_DAY + hours * HOUR_MINUTES + minutes;
}

export function normaliseScheduleTime(value: unknown, fallback: ScheduleTime, baseValue?: string): ScheduleTime {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const legacyValue = legacyDateTimeToScheduleTime(value, baseValue);

    if (legacyValue != null) {
      return legacyValue;
    }
  }

  return fallback;
}

export function arePointsChronological(points: ExpansionPoint[]): boolean {
  return points.every((point, index) => {
    if (index === 0) {
      return true;
    }

    return points[index - 1].time < point.time;
  });
}

export function sortPointsByTime(points: ExpansionPoint[]): ExpansionPoint[] {
  return [...points].sort((left, right) => left.time - right.time);
}
