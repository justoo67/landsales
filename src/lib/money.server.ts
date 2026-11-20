import { Prisma } from '@prisma/client';
import { parseKes } from './money';

/**
 * Server-only money helpers.
 *
 * Prisma returns `Decimal` instances for money columns. They must never be
 * passed to `JSON.stringify` directly (they serialise as strings, which breaks
 * every client calculation), so route handlers funnel them through
 * `serializeMoney`.
 */

export const D = Prisma.Decimal;

export type MoneyInput = Prisma.Decimal | number | string | null | undefined;

/** Convert anything money-shaped into a Decimal, or null when absent. */
export function toDecimal(value: MoneyInput): Prisma.Decimal | null {
  if (value === null || value === undefined || value === '') return null;
  return new Prisma.Decimal(value);
}

/**
 * Convert a raw request value (which may be `"1,500,000"`) into a Decimal.
 * Throws `RangeError` on invalid input so route handlers can answer 400.
 */
export function requestMoney(value: unknown): Prisma.Decimal | null {
  const parsed = parseKes(value);
  return parsed === null ? null : new Prisma.Decimal(parsed);
}

/** Decimal -> number for JSON responses. `null` stays `null`. */
export function serializeMoney(value: MoneyInput): number | null {
  if (value === null || value === undefined) return null;
  const decimal = new Prisma.Decimal(value);
  return decimal.toNumber();
}

/** Sum a list of Decimals without leaving Decimal space. */
export function sumDecimals(values: Prisma.Decimal[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (total, value) => total.plus(value),
    new Prisma.Decimal(0)
  );
}

/** `max(0, a - b)`, the balance rule used across the ledger. */
export function subtractFloorZero(
  a: Prisma.Decimal,
  b: Prisma.Decimal
): Prisma.Decimal {
  const result = a.minus(b);
  return result.isNegative() ? new Prisma.Decimal(0) : result;
}
