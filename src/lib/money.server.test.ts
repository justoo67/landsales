import { describe, expect, it } from 'vitest';
import {
  D,
  requestMoney,
  serializeMoney,
  subtractFloorZero,
  sumDecimals,
  toDecimal,
} from './money.server';

describe('toDecimal', () => {
  it('accepts numbers, strings and Decimals', () => {
    expect(toDecimal(1500000)?.toString()).toBe('1500000');
    expect(toDecimal('1500000.50')?.toString()).toBe('1500000.5');
    expect(toDecimal(new D('250'))?.toString()).toBe('250');
  });

  it('returns null for absent values', () => {
    expect(toDecimal(null)).toBeNull();
    expect(toDecimal(undefined)).toBeNull();
    expect(toDecimal('')).toBeNull();
  });
});

describe('requestMoney', () => {
  it('parses agent input', () => {
    expect(requestMoney('1,500,000')?.toString()).toBe('1500000');
  });

  it('throws on junk so routes can answer 400', () => {
    expect(() => requestMoney('one million')).toThrow(RangeError);
  });
});

describe('arithmetic', () => {
  it('sums without floating point drift', () => {
    // 0.1 + 0.2 !== 0.3 in binary floats; Decimal must be exact.
    const total = sumDecimals([new D('0.1'), new D('0.2')]);
    expect(total.toString()).toBe('0.3');
  });

  it('floors a balance at zero', () => {
    expect(subtractFloorZero(new D('100'), new D('150')).toString()).toBe('0');
    expect(subtractFloorZero(new D('150'), new D('100')).toString()).toBe('50');
  });

  it('serialises to a JSON-safe number', () => {
    expect(serializeMoney(new D('1500000'))).toBe(1500000);
    expect(serializeMoney(null)).toBeNull();
  });
});
