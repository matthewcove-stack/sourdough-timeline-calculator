import { describe, expect, it } from 'vitest';
import { formatScheduleTime, formatTime, schedulePlainText } from '../lib/formatting';
import type { FeedStage, SchedulePlan } from '../types/schedule';

describe('generic schedule formatting', () => {
  it('formats clock times without dates', () => {
    expect(formatTime(6 * 60)).toBe('06:00');
  });

  it('formats cross-day schedule times with day labels', () => {
    expect(formatScheduleTime(24 * 60 + 13 * 60)).toBe('Day 2 13:00');
  });

  it('uses generic day labels in copied schedules', () => {
    const stage: FeedStage = {
      id: 'feed-1',
      feedNumber: 1,
      point: { id: 'feed-1', time: 18 * 60 },
      starterBefore: 50,
      targetAfter: 200,
      expansionRatio: 4,
      additions: {
        addedFeed: 150,
        flourAdded: 75,
        waterAdded: 75
      },
      hydrationPercent: 100,
      segment: {
        id: 'segment-feed-1',
        startTime: 18 * 60,
        endTime: 24 * 60 + 6 * 60,
        durationHours: 12,
        expansionRatio: 4,
        suggestedTemperature: 21,
        temperatureLocked: false,
        ratioInSafeRange: true,
        temperatureInPracticalRange: true
      },
      status: 'info'
    };
    const plan: SchedulePlan = {
      idealRatio: 4,
      stages: [stage],
      segments: [stage.segment],
      warnings: []
    };

    expect(schedulePlainText(plan)).toContain('Feed 1 - Day 1 18:00');
    expect(schedulePlainText(plan)).toContain('until Day 2 06:00');
  });
});
