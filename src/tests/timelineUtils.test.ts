import { describe, expect, it } from 'vitest';
import {
  defaultWorkingHours,
  durationHours,
  formatScheduleTime,
  getDefaultTimelineRange,
  getWorkingHourBands,
  isWithinWorkingHours,
  legacyDateTimeToScheduleTime,
  moveToPreviousWorkingTime,
  snapScheduleTime
} from '../lib/timelineUtils';

const day = 24 * 60;

describe('timeline utilities', () => {
  it('segments the visible range into working and non-working bands', () => {
    const bands = getWorkingHourBands(19 * 60, day + 7 * 60, defaultWorkingHours());

    expect(bands.map(band => band.kind)).toEqual(['working', 'nonWorking', 'working']);
    expect(durationHours(bands[0].startTime, bands[0].endTime)).toBeCloseTo(1);
    expect(durationHours(bands[1].startTime, bands[1].endTime)).toBeCloseTo(10);
    expect(durationHours(bands[2].startTime, bands[2].endTime)).toBeCloseTo(1);
  });

  it('snaps schedule times to sensible increments', () => {
    expect(snapScheduleTime(19 * 60 + 8, 15)).toBe(19 * 60 + 15);
  });

  it('supports overnight working hours', () => {
    const workingHours = { start: '20:00', end: '06:00' };

    expect(isWithinWorkingHours(22 * 60, workingHours)).toBe(true);
    expect(isWithinWorkingHours(day + 5 * 60 + 30, workingHours)).toBe(true);
    expect(isWithinWorkingHours(day + 12 * 60, workingHours)).toBe(false);
  });

  it('moves fitted feed times back into working hours', () => {
    expect(moveToPreviousWorkingTime(22 * 60, defaultWorkingHours(), 15)).toBe(19 * 60 + 45);
  });

  it('defaults from one opening time to halfway through the next working block', () => {
    const range = getDefaultTimelineRange(defaultWorkingHours());

    expect(range.timelineStart).toBe(6 * 60);
    expect(range.firstWorkingEnd).toBe(20 * 60);
    expect(range.secondWorkingStart).toBe(day + 6 * 60);
    expect(range.secondWorkingEnd).toBe(day + 20 * 60);
    expect(range.timelineEnd).toBe(day + 13 * 60);
  });

  it('defaults cleanly with overnight working blocks', () => {
    const workingHours = { start: '20:00', end: '06:00' };
    const range = getDefaultTimelineRange(workingHours);

    expect(range.timelineStart).toBe(20 * 60);
    expect(range.firstWorkingEnd).toBe(day + 6 * 60);
    expect(range.secondWorkingStart).toBe(day + 20 * 60);
    expect(range.secondWorkingEnd).toBe(2 * day + 6 * 60);
    expect(range.timelineEnd).toBe(2 * day + 60);
  });

  it('formats generic schedule times without calendar dates', () => {
    expect(formatScheduleTime(day + 13 * 60)).toBe('Day 2 13:00');
  });

  it('can migrate old saved date-time values into generic schedule times', () => {
    expect(legacyDateTimeToScheduleTime('2026-06-11T06:30', '2026-06-10T08:00')).toBe(day + 6 * 60 + 30);
  });
});
