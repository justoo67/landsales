import { describe, expect, it } from 'vitest';
import { formatPhone, normalizePhone, whatsappNumber } from './phone';

describe('normalizePhone', () => {
  it('normalises Kenyan formats', () => {
    expect(normalizePhone('0712 345 678')).toBe('+254712345678');
    expect(normalizePhone('0712345678')).toBe('+254712345678');
    expect(normalizePhone('712345678')).toBe('+254712345678');
    expect(normalizePhone('254712345678')).toBe('+254712345678');
    expect(normalizePhone('+254 712 345 678')).toBe('+254712345678');
    expect(normalizePhone('00254712345678')).toBe('+254712345678');
  });

  it('accepts other countries when a prefix is supplied', () => {
    expect(normalizePhone('+44 7700 900123')).toBe('+447700900123');
    expect(normalizePhone('+1 (555) 010-9999')).toBe('+15550109999');
  });

  it('rejects empty or implausible input', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('   ')).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
  });

  it('is stable under repeated normalisation', () => {
    const once = normalizePhone('0712 345 678');
    expect(normalizePhone(once!)).toBe(once);
  });
});

describe('formatPhone', () => {
  it('renders Kenyan numbers in local form', () => {
    expect(formatPhone('+254712345678')).toBe('0712 345 678');
  });

  it('passes through unparseable input', () => {
    expect(formatPhone('call me')).toBe('call me');
  });
});

describe('whatsappNumber', () => {
  it('strips punctuation for wa.me links', () => {
    expect(whatsappNumber('+254 712 345 678')).toBe('254712345678');
  });
});
