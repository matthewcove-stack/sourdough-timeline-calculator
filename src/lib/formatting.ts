import type { FeedStage, SchedulePlan, ScheduleTime } from '../types/schedule';
import { clockTimeFromMinutes, formatScheduleTime as formatGenericScheduleTime } from './timelineUtils';

export function roundTo(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function grams(value: number): string {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }

  return `${roundTo(value, value >= 10 ? 0 : 1)}g`;
}

export function celsius(value: number): string {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }

  return `${roundTo(value, 1)}C`;
}

export function ratio(value: number): string {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }

  return `${roundTo(value, 2)}x`;
}

export function formatTime(value: ScheduleTime): string {
  return clockTimeFromMinutes(value);
}

export function formatScheduleTime(value: ScheduleTime): string {
  return formatGenericScheduleTime(value);
}

export function formatDuration(hours: number): string {
  if (!Number.isFinite(hours)) {
    return 'n/a';
  }

  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (wholeHours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${wholeHours}h`;
  }

  return `${wholeHours}h ${minutes}m`;
}

export function stagePlainText(stage: FeedStage): string {
  return `Feed ${stage.feedNumber} - ${formatScheduleTime(stage.point.time)}
Use ${grams(stage.starterBefore)} starter. Add ${grams(stage.additions.flourAdded)} flour and ${grams(
    stage.additions.waterAdded
  )} water. Total after feeding: ${grams(stage.targetAfter)}. This is a ${ratio(
    stage.expansionRatio
  )} expansion. Mix and hold at approximately ${celsius(stage.segment.suggestedTemperature)} until ${formatScheduleTime(
    stage.segment.endTime
  )}.`;
}

export function schedulePlainText(plan: SchedulePlan): string {
  if (plan.stages.length === 0) {
    return 'No feeding schedule yet.';
  }

  return plan.stages.map(stagePlainText).join('\n\n');
}
