/**
 * Deterministic, explainable price guidance.
 *
 * No machine learning: the agent sees the exact comparables that produced the
 * range, so they can defend the number to a buyer or reject it.
 */

export interface CompLike {
  id: string;
  sizeAcres: number;
  pricePerAcre: number;
  [key: string]: unknown;
}

export interface PriceGuidance<T extends CompLike> {
  low: number;
  mid: number;
  high: number;
  count: number;
  comps: T[];
}

/** Size window around the subject plot, as a fraction (0.4 = ±40%). */
export const SIZE_BAND = 0.4;

/** Minimum comps before a range is worth showing. */
export const MIN_COMPS = 2;

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/** Keep comps within ±band of the subject plot's size. */
export function selectComps<T extends CompLike>(
  comps: T[],
  targetAcres: number,
  band = SIZE_BAND
): T[] {
  if (!targetAcres || targetAcres <= 0) return [];
  const min = targetAcres * (1 - band);
  const max = targetAcres * (1 + band);
  return comps.filter((comp) => comp.sizeAcres >= min && comp.sizeAcres <= max);
}

export function computeGuidance<T extends CompLike>(
  comps: T[],
  targetAcres: number | null
): PriceGuidance<T> | null {
  if (!targetAcres) return null;

  const used = selectComps(comps, targetAcres).filter(
    (comp) => comp.pricePerAcre > 0
  );

  if (used.length < MIN_COMPS) return null;

  const perAcre = used.map((comp) => comp.pricePerAcre).sort((a, b) => a - b);
  const mid = median(perAcre);
  if (!mid) return null;

  return {
    low: Math.round(percentile(perAcre, 0.25)),
    mid: Math.round(mid),
    high: Math.round(percentile(perAcre, 0.75)),
    count: used.length,
    comps: [...used].sort((a, b) => b.pricePerAcre - a.pricePerAcre),
  };
}

/** Signed deviation of the asking price from the comp mid-point, in percent. */
export function deviationPercent(asking: number | null, mid: number | null): number | null {
  if (!asking || !mid || mid <= 0) return null;
  return Math.round(((asking - mid) / mid) * 100);
}
