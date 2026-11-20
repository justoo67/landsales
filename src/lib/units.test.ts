import { describe, expect, it } from 'vitest';
import { acresFromPreset, formatAcres, pricePerAcre } from './units';

describe('acresFromPreset', () => {
  it('converts standard Kenyan plot presets', () => {
    expect(acresFromPreset('50x100')).toBeCloseTo(0.1148, 3);
    expect(acresFromPreset('40x80')).toBeCloseTo(0.0735, 3);
    expect(acresFromPreset('100x100')).toBeCloseTo(0.2296, 3);
  });

  it('reads acres, hectares and square metres', () => {
    expect(acresFromPreset('ACRES', '2.5')).toBe(2.5);
    expect(acresFromPreset('HECTARES', '1')).toBeCloseTo(2.4711, 3);
    expect(acresFromPreset('SQM', '4046.86')).toBeCloseTo(1, 2);
  });

  it('parses freeform custom values', () => {
    expect(acresFromPreset('CUSTOM', '100x150 ft')).toBeCloseTo(0.3444, 3);
    expect(acresFromPreset('CUSTOM', '5 Acres Freehold')).toBe(5);
    expect(acresFromPreset('CUSTOM', '0.4 ha')).toBeCloseTo(0.988, 2);
    expect(acresFromPreset('CUSTOM', '800 sqm')).toBeCloseTo(0.1977, 2);
  });

  it('handles legacy preset strings with the number inside', () => {
    expect(acresFromPreset('5 Acres', '5 Acres Freehold')).toBe(5);
  });

  it('returns null when nothing is parseable', () => {
    expect(acresFromPreset(null, null)).toBeNull();
    expect(acresFromPreset('CUSTOM', 'big')).toBeNull();
    expect(acresFromPreset('ACRES', '')).toBeNull();
  });
});

describe('formatAcres', () => {
  it('reads naturally', () => {
    expect(formatAcres(1)).toBe('1 acre');
    expect(formatAcres(2.5)).toBe('2.5 acres');
    expect(formatAcres(0.1148)).toBe('0.11 acres');
    expect(formatAcres(null)).toBe('—');
  });
});

describe('pricePerAcre', () => {
  it('divides price by acres', () => {
    expect(pricePerAcre(2_450_000, 0.5)).toBe(4_900_000);
    expect(pricePerAcre(2_450_000, null)).toBeNull();
    expect(pricePerAcre(2_450_000, 0)).toBeNull();
  });
});
