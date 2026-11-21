import { describe, expect, it } from 'vitest';
import { parseAllowedEmails } from './allowlist';

describe('parseAllowedEmails', () => {
  it('splits comma-separated values', () => {
    expect(parseAllowedEmails('a@example.com,b@example.com')).toEqual([
      'a@example.com',
      'b@example.com',
    ]);
  });

  it('splits newline-separated values (Vercel multi-line paste)', () => {
    expect(parseAllowedEmails('a@example.com\nb@example.com\nc@example.com')).toEqual([
      'a@example.com',
      'b@example.com',
      'c@example.com',
    ]);
  });

  it('splits mixed separators and trims whitespace', () => {
    expect(
      parseAllowedEmails(' A@Example.com ,\n b@example.com \r\n\tc@example.com ')
    ).toEqual(['a@example.com', 'b@example.com', 'c@example.com']);
  });

  it('returns an empty list for unset or blank values', () => {
    expect(parseAllowedEmails(undefined)).toEqual([]);
    expect(parseAllowedEmails('')).toEqual([]);
    expect(parseAllowedEmails('  \n , \t ')).toEqual([]);
  });
});
