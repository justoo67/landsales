/**
 * Money helpers that are safe to import from client components.
 *
 * The database stores KES as `Decimal(14,2)`. Server code never converts to
 * `number` until it crosses the JSON boundary (see `money.server.ts`), and the
 * client always receives plain numbers.
 */

const GROUPING = new Intl.NumberFormat('en-KE', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/**
 * Parse user input into a KES amount.
 * Accepts `1500000`, `"1,500,000"`, `"KES 1 500 000"`, `"ksh 1500000.50"`.
 *
 * Returns `null` when the value is absent. Throws `RangeError` when it is
 * present but not a valid, non-negative amount.
 */
export function parseKes(input: unknown): number | null {
  if (input === null || input === undefined) return null;

  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input < 0) {
      throw new RangeError('Amount must be a positive number');
    }
    return input;
  }

  const raw = String(input).trim();
  if (!raw) return null;

  const cleaned = raw
    .replace(/(ksh|kes)/gi, '')
    .replace(/[,\s_]/g, '');

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new RangeError(`"${raw}" is not a valid amount`);
  }

  return Number(cleaned);
}

/** Format an amount as the agent expects to read it: `KSh 1,500,000`. */
export function formatKes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return `KSh ${GROUPING.format(value)}`;
}

/** Percentage of `part` in `whole`, clamped to 0–100. */
export function percentOf(part: number, whole: number): number {
  if (!whole || whole <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((part / whole) * 100)));
}
