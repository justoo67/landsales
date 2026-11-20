import { describe, expect, it } from 'vitest';
import {
  computeGuidance,
  deviationPercent,
  median,
  selectComps,
  MIN_COMPS,
} from './pricing';

const comp = (id: string, sizeAcres: number, pricePerAcre: number) => ({
  id,
  sizeAcres,
  pricePerAcre,
});

describe('median', () => {
  it('handles odd and even lengths', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe('selectComps', () => {
  it('keeps comps within the size band', () => {
    const comps = [comp('a', 0.08, 1), comp('b', 0.11, 1), comp('c', 0.5, 1)];
    const selected = selectComps(comps, 0.1148);
    expect(selected.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('returns nothing without a target', () => {
    expect(selectComps([comp('a', 1, 1)], 0)).toEqual([]);
  });
});

describe('computeGuidance', () => {
  it('needs at least the minimum number of comps', () => {
    const single = [comp('a', 0.11, 4_000_000)];
    expect(MIN_COMPS).toBeGreaterThan(1);
    expect(computeGuidance(single, 0.1148)).toBeNull();
  });

  it('produces a low/mid/high range', () => {
    const comps = [
      comp('a', 0.11, 3_000_000),
      comp('b', 0.12, 4_000_000),
      comp('c', 0.10, 5_000_000),
      comp('d', 0.11, 6_000_000),
    ];
    const guidance = computeGuidance(comps, 0.1148);
    expect(guidance).not.toBeNull();
    if (!guidance) return;

    expect(guidance.count).toBe(4);
    expect(guidance.mid).toBe(4_500_000);
    expect(guidance.low).toBeGreaterThan(3_000_000);
    expect(guidance.high).toBeLessThan(6_000_000);
    expect(guidance.low).toBeLessThan(guidance.high);
  });

  it('ignores comps of a very different size', () => {
    const comps = [
      comp('a', 0.11, 4_000_000),
      comp('b', 0.12, 4_200_000),
      comp('huge', 5, 900_000),
    ];
    const guidance = computeGuidance(comps, 0.1148);
    expect(guidance?.count).toBe(2);
    expect(guidance?.comps.some((c) => c.id === 'huge')).toBe(false);
  });

  it('returns null without a target size', () => {
    expect(computeGuidance([comp('a', 1, 1)], null)).toBeNull();
  });
});

describe('deviationPercent', () => {
  it('signs the gap', () => {
    expect(deviationPercent(120, 100)).toBe(20);
    expect(deviationPercent(80, 100)).toBe(-20);
    expect(deviationPercent(null, 100)).toBeNull();
  });
});
