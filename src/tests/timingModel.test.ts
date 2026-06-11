import { describe, expect, it } from 'vitest';
import {
  baseMaturationHoursAt21C,
  estimateMaturationHours,
  solveTemperatureForDuration
} from '../lib/timingModel';

describe('timing model', () => {
  it('interpolates the reference expansion ratios at 21C', () => {
    expect(baseMaturationHoursAt21C(2)).toBeCloseTo(6);
    expect(baseMaturationHoursAt21C(3.5)).toBeCloseTo(9);
    expect(baseMaturationHoursAt21C(5)).toBeCloseTo(12);
  });

  it('halves maturation time for every 5C warmer', () => {
    expect(estimateMaturationHours(2, 26, 1)).toBeCloseTo(3);
  });

  it('applies faster starter correction by shortening time', () => {
    expect(estimateMaturationHours(2, 21, 2)).toBeCloseTo(3);
  });

  it('solves the inverse temperature for a target duration', () => {
    expect(solveTemperatureForDuration(6, 2, 1)).toBeCloseTo(21);
    expect(solveTemperatureForDuration(3, 2, 1)).toBeCloseTo(26);
  });
});
