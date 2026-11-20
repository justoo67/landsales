import { describe, expect, it } from 'vitest';
import { formatKes, parseKes, percentOf } from './money';

describe('parseKes', () => {
  it('accepts plain numbers', () => {
    expect(parseKes(1500000)).toBe(1500000);
    expect(parseKes(0)).toBe(0);
  });

  it('accepts formatted strings', () => {
    expect(parseKes('1,500,000')).toBe(1500000);
    expect(parseKes('KES 1 500 000')).toBe(1500000);
    expect(parseKes('ksh 1,500,000.50')).toBe(1500000.5);
    expect(parseKes(' 250000 ')).toBe(250000);
  });

  it('returns null for absent values', () => {
    expect(parseKes(null)).toBeNull();
    expect(parseKes(undefined)).toBeNull();
    expect(parseKes('')).toBeNull();
    expect(parseKes('   ')).toBeNull();
  });

  it('rejects invalid amounts', () => {
    expect(() => parseKes('abc')).toThrow(RangeError);
    expect(() => parseKes('1.2.3')).toThrow(RangeError);
    expect(() => parseKes('-500')).toThrow(RangeError);
    expect(() => parseKes(Number.NaN)).toThrow(RangeError);
    expect(() => parseKes(-1)).toThrow(RangeError);
  });

  it('rejects more than two decimal places', () => {
    expect(() => parseKes('100.123')).toThrow(RangeError);
  });
});

describe('formatKes', () => {
  it('groups thousands', () => {
    expect(formatKes(1500000)).toBe('KSh 1,500,000');
    expect(formatKes(0)).toBe('KSh 0');
  });

  it('keeps cents when present', () => {
    expect(formatKes(1500000.5)).toContain('1,500,000.5');
  });

  it('renders a dash for missing values', () => {
    expect(formatKes(null)).toBe('—');
    expect(formatKes(undefined)).toBe('—');
  });
});

describe('percentOf', () => {
  it('rounds and clamps', () => {
    expect(percentOf(50, 200)).toBe(25);
    expect(percentOf(300, 200)).toBe(100);
    expect(percentOf(10, 0)).toBe(0);
  });
});
