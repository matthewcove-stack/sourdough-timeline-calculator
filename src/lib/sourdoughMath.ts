import type {
  ExpansionPoint,
  FeedAdditions,
  FeedStage,
  SchedulePlan,
  ScheduleSegment,
  ScheduleSettings,
  ScheduleWarning,
  WarningLevel
} from '../types/schedule';
import { solveTemperatureForDuration } from './timingModel';
import { arePointsChronological, durationHours, sortPointsByTime } from './timelineUtils';

export function calculateFeedAdditions(
  starterBefore: number,
  targetAfter: number,
  hydrationPercent: number
): FeedAdditions {
  const addedFeed = targetAfter - starterBefore;
  const hydrationDecimal = hydrationPercent / 100;
  const flourAdded = addedFeed / (1 + hydrationDecimal);
  const waterAdded = addedFeed - flourAdded;

  return {
    addedFeed,
    flourAdded,
    waterAdded
  };
}

export function distributeEvenExpansionRatio(
  initialAmount: number,
  finalAmount: number,
  expansionCount: number
): number {
  if (initialAmount <= 0 || finalAmount <= 0 || expansionCount <= 0) {
    return Number.NaN;
  }

  return (finalAmount / initialAmount) ** (1 / expansionCount);
}

export function isExpansionRatioInSafeRange(
  ratio: number,
  minExpansionRatio: number,
  maxExpansionRatio: number
): boolean {
  return ratio >= minExpansionRatio && ratio <= maxExpansionRatio;
}

function createWarning(id: string, level: WarningLevel, message: string): ScheduleWarning {
  return { id, level, message };
}

function statusFromSegment(segment: ScheduleSegment): WarningLevel {
  if (segment.durationHours <= 0 || !Number.isFinite(segment.suggestedTemperature)) {
    return 'error';
  }

  if (!segment.ratioInSafeRange || !segment.temperatureInPracticalRange) {
    return 'warning';
  }

  return 'info';
}

function lockedRatio(point: ExpansionPoint): number | null {
  if (point.lockedExpansionRatio == null || point.lockedExpansionRatio <= 0) {
    return null;
  }

  return point.lockedExpansionRatio;
}

function resolveStageRatios(
  settings: ScheduleSettings,
  sortedPoints: ExpansionPoint[],
  warnings: ScheduleWarning[]
): number[] {
  const totalGrowth = settings.finalAmount / settings.initialAmount;
  const lockedRatios = sortedPoints.map(lockedRatio);
  const lockedProduct = lockedRatios.reduce<number>((product, ratio) => product * (ratio ?? 1), 1);
  const unlockedCount = lockedRatios.filter(ratio => ratio == null).length;

  if (unlockedCount === 0) {
    if (Math.abs(lockedProduct - totalGrowth) > 0.01) {
      warnings.push(
        createWarning(
          'locked-ratio-total',
          'warning',
          'Locked expansion ratios do not multiply to the required final starter amount. Unlock at least one ratio to rebalance the plan.'
        )
      );
    }

    return lockedRatios.map(ratio => ratio ?? Number.NaN);
  }

  const remainingGrowth = totalGrowth / lockedProduct;

  if (remainingGrowth <= 0 || !Number.isFinite(remainingGrowth)) {
    warnings.push(createWarning('ratio-balance', 'error', 'Expansion ratios cannot be balanced with the current amounts.'));
    return lockedRatios.map(ratio => ratio ?? Number.NaN);
  }

  const balancedRatio = remainingGrowth ** (1 / unlockedCount);
  return lockedRatios.map(ratio => ratio ?? balancedRatio);
}

export function buildSchedulePlan(settings: ScheduleSettings, points: ExpansionPoint[]): SchedulePlan {
  const warnings: ScheduleWarning[] = [];
  const timelineStart = settings.timelineStart;
  const timelineEnd = settings.timelineEnd;
  const finalReadyAt = settings.finalReadyAt;

  if (timelineStart >= timelineEnd) {
    warnings.push(createWarning('timeline-range', 'error', 'Timeline start must be before timeline end.'));
  }

  if (finalReadyAt < timelineStart || finalReadyAt > timelineEnd) {
    warnings.push(createWarning('final-outside-visible', 'warning', 'Final ready time is outside the visible timeline range.'));
  }

  if (settings.finalAmount <= settings.initialAmount) {
    warnings.push(createWarning('final-amount', 'error', 'Final starter amount must be greater than the initial starter amount.'));
  }

  if (points.length === 0) {
    warnings.push(createWarning('no-expansion-points', 'warning', 'Add at least one expansion point to calculate a feeding schedule.'));
  }

  if (!arePointsChronological(points)) {
    warnings.push(createWarning('chronological-order', 'warning', 'Expansion points are not in chronological order.'));
  }

  const sortedPoints = sortPointsByTime(points);
  const idealRatio = distributeEvenExpansionRatio(settings.initialAmount, settings.finalAmount, sortedPoints.length);
  const hasLockedRatio = sortedPoints.some(point => lockedRatio(point) != null);

  if (Number.isFinite(idealRatio) && sortedPoints.length > 0 && !hasLockedRatio) {
    if (idealRatio < settings.minExpansionRatio) {
      warnings.push(
        createWarning(
          'ratio-too-low',
          'warning',
          'Even distribution is below the safe expansion range. Removing an expansion point may help.'
        )
      );
    }

    if (idealRatio > settings.maxExpansionRatio) {
      warnings.push(
        createWarning(
          'ratio-too-high',
          'warning',
          'Even distribution exceeds the safe expansion range. Adding an expansion point may help.'
        )
      );
    }
  }

  const segments: ScheduleSegment[] = [];
  const stages: FeedStage[] = [];

  if (!Number.isFinite(idealRatio) || sortedPoints.length === 0) {
    return {
      idealRatio: Number.isFinite(idealRatio) ? idealRatio : null,
      stages,
      segments,
      warnings
    };
  }

  let starterBefore = settings.initialAmount;
  const ratios = resolveStageRatios(settings, sortedPoints, warnings);

  sortedPoints.forEach((point, index) => {
    const stageRatio = ratios[index];
    const allRatiosBalanced = ratios.every(ratio => Number.isFinite(ratio));
    const targetAfter =
      index === sortedPoints.length - 1 && allRatiosBalanced && sortedPoints.some(stage => lockedRatio(stage) == null)
        ? settings.finalAmount
        : starterBefore * stageRatio;
    const segmentEnd = sortedPoints[index + 1]?.time ?? settings.finalReadyAt;
    const segmentDurationHours = durationHours(point.time, segmentEnd);
    const solvedTemperature = point.lockedTemperature ?? solveTemperatureForDuration(
      segmentDurationHours,
      stageRatio,
      settings.speedCorrection
    );
    const ratioInSafeRange = isExpansionRatioInSafeRange(
      stageRatio,
      settings.minExpansionRatio,
      settings.maxExpansionRatio
    );
    const temperatureInPracticalRange =
      Number.isFinite(solvedTemperature) &&
      solvedTemperature >= settings.minTemperature &&
      solvedTemperature <= settings.maxTemperature;

    const segment: ScheduleSegment = {
      id: `segment-${point.id}`,
      startTime: point.time,
      endTime: segmentEnd,
      durationHours: segmentDurationHours,
      expansionRatio: stageRatio,
      suggestedTemperature: solvedTemperature,
      temperatureLocked: point.lockedTemperature != null,
      ratioInSafeRange,
      temperatureInPracticalRange
    };

    if (segmentDurationHours <= 0) {
      warnings.push(
        createWarning(
          `segment-duration-${point.id}`,
          'error',
          `Feed ${index + 1} has zero or negative time before the next required point.`
        )
      );
    }

    if (!temperatureInPracticalRange && segmentDurationHours > 0) {
      warnings.push(
        createWarning(
          `segment-temperature-${point.id}`,
          'warning',
          `Feed ${index + 1} needs a target mix/hold temperature of ${solvedTemperature.toFixed(1)}C, outside the practical temperature range.`
        )
      );
    }

    if (!ratioInSafeRange) {
      warnings.push(
        createWarning(
          `segment-ratio-${point.id}`,
          'warning',
          `Feed ${index + 1} uses a ${stageRatio.toFixed(2)}x total expansion ratio, outside the safe range.`
        )
      );
    }

    const additions = calculateFeedAdditions(starterBefore, targetAfter, settings.hydrationPercent);

    segments.push(segment);
    stages.push({
      id: point.id,
      feedNumber: index + 1,
      point,
      starterBefore,
      targetAfter,
      expansionRatio: stageRatio,
      additions,
      hydrationPercent: settings.hydrationPercent,
      segment,
      status: statusFromSegment(segment)
    });

    starterBefore = targetAfter;
  });

  return {
    idealRatio,
    stages,
    segments,
    warnings
  };
}
