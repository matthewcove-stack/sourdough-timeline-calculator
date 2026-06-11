const BASE_TEMPERATURE_C = 21;
const TEMPERATURE_HALVING_STEP_C = 5;

const referencePoints = [
  { ratio: 2, hours: 6 },
  { ratio: 3, hours: 8 },
  { ratio: 4, hours: 10 },
  { ratio: 5, hours: 12 }
];

export function baseMaturationHoursAt21C(expansionRatio: number): number {
  if (!Number.isFinite(expansionRatio) || expansionRatio <= 0) {
    return Number.NaN;
  }

  if (expansionRatio <= referencePoints[0].ratio) {
    return Math.max(0.25, 6 + (expansionRatio - 2) * 2);
  }

  for (let index = 0; index < referencePoints.length - 1; index += 1) {
    const left = referencePoints[index];
    const right = referencePoints[index + 1];

    if (expansionRatio >= left.ratio && expansionRatio <= right.ratio) {
      const progress = (expansionRatio - left.ratio) / (right.ratio - left.ratio);
      return left.hours + progress * (right.hours - left.hours);
    }
  }

  const last = referencePoints[referencePoints.length - 1];
  return last.hours + (expansionRatio - last.ratio) * 2;
}

export function estimateMaturationHours(
  expansionRatio: number,
  temperatureC: number,
  speedCorrection: number
): number {
  if (speedCorrection <= 0 || !Number.isFinite(speedCorrection)) {
    return Number.NaN;
  }

  const baseHours = baseMaturationHoursAt21C(expansionRatio);
  const temperatureFactor = 2 ** ((BASE_TEMPERATURE_C - temperatureC) / TEMPERATURE_HALVING_STEP_C);
  return (baseHours * temperatureFactor) / speedCorrection;
}

export function solveTemperatureForDuration(
  durationHours: number,
  expansionRatio: number,
  speedCorrection: number
): number {
  if (
    durationHours <= 0 ||
    speedCorrection <= 0 ||
    !Number.isFinite(durationHours) ||
    !Number.isFinite(speedCorrection)
  ) {
    return Number.NaN;
  }

  const baseHours = baseMaturationHoursAt21C(expansionRatio);
  if (!Number.isFinite(baseHours) || baseHours <= 0) {
    return Number.NaN;
  }

  return BASE_TEMPERATURE_C - TEMPERATURE_HALVING_STEP_C * Math.log2((durationHours * speedCorrection) / baseHours);
}
