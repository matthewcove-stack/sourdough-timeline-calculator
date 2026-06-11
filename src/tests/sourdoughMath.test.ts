import { describe, expect, it } from 'vitest';
import {
  buildSchedulePlan,
  calculateFeedAdditions,
  distributeEvenExpansionRatio,
  isExpansionRatioInSafeRange
} from '../lib/sourdoughMath';
import { arePointsChronological, defaultWorkingHours } from '../lib/timelineUtils';
import type { ExpansionPoint, ScheduleSettings } from '../types/schedule';

const baseSettings: ScheduleSettings = {
  initialAmount: 25,
  finalAmount: 400,
  finalReadyAt: 24 * 60 + 10 * 60,
  timelineStart: 8 * 60,
  timelineEnd: 24 * 60 + 12 * 60,
  hydrationPercent: 100,
  minExpansionRatio: 2,
  maxExpansionRatio: 5,
  minTemperature: 16,
  maxTemperature: 30,
  speedCorrection: 1,
  snapMinutes: 15,
  workingHours: defaultWorkingHours()
};

describe('sourdough math', () => {
  it('calculates hydration-adjusted flour and water additions', () => {
    expect(calculateFeedAdditions(100, 200, 100)).toEqual({
      addedFeed: 100,
      flourAdded: 50,
      waterAdded: 50
    });
  });

  it('distributes growth evenly by total expansion ratio', () => {
    expect(distributeEvenExpansionRatio(25, 400, 4)).toBeCloseTo(2);
  });

  it('checks expansion-ratio safe ranges inclusively', () => {
    expect(isExpansionRatioInSafeRange(2, 2, 5)).toBe(true);
    expect(isExpansionRatioInSafeRange(5.2, 2, 5)).toBe(false);
  });

  it('warns when the even ratio exceeds the safe range', () => {
    const points: ExpansionPoint[] = [{ id: 'feed-1', time: 18 * 60 }];
    const plan = buildSchedulePlan({ ...baseSettings, finalAmount: 1000 }, points);

    expect(plan.warnings.some(warning => warning.id === 'ratio-too-high')).toBe(true);
    expect(plan.warnings.some(warning => warning.id === 'segment-ratio-feed-1')).toBe(true);
  });

  it('detects non-chronological expansion points', () => {
    expect(
      arePointsChronological([
        { id: 'feed-2', time: 20 * 60 },
        { id: 'feed-1', time: 18 * 60 }
      ])
    ).toBe(false);
  });

  it('rebalances unlocked expansion ratios when one stage is locked', () => {
    const points: ExpansionPoint[] = [
      { id: 'feed-1', time: 10 * 60, lockedExpansionRatio: 4 },
      { id: 'feed-2', time: 18 * 60 }
    ];
    const plan = buildSchedulePlan({ ...baseSettings, initialAmount: 50, finalAmount: 400 }, points);

    expect(plan.stages[0].expansionRatio).toBeCloseTo(4);
    expect(plan.stages[1].expansionRatio).toBeCloseTo(2);
    expect(plan.stages[1].targetAfter).toBeCloseTo(400);
  });
});
