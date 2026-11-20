import { describe, expect, it } from 'vitest';
import type { Commission, SaleRecord } from '@prisma/client';
import {
  agingBucket,
  commissionAmount,
  commissionTotals,
  receivablesAging,
} from './finance';
import { D } from './money.server';

function sale(balanceKes: number, daysFromNow: number | null) {
  const due = daysFromNow === null ? null : new Date(Date.now() + daysFromNow * 86_400_000);
  return { balanceKes: new D(balanceKes), nextDueDate: due } as unknown as SaleRecord;
}

function commission(amount: number, status: string) {
  return {
    amountKes: new D(amount),
    status,
  } as unknown as Commission;
}

describe('agingBucket', () => {
  it('places balances by days past due', () => {
    expect(agingBucket(new Date(Date.now() + 5 * 86_400_000))).toBe('current');
    expect(agingBucket(new Date(Date.now() - 2 * 86_400_000))).toBe('d0_30');
    expect(agingBucket(new Date(Date.now() - 45 * 86_400_000))).toBe('d31_60');
    expect(agingBucket(new Date(Date.now() - 90 * 86_400_000))).toBe('d60plus');
    expect(agingBucket(null)).toBe('undated');
  });
});

describe('receivablesAging', () => {
  it('sums balances into buckets and ignores settled sales', () => {
    const aging = receivablesAging([
      sale(1_000_000, 10),
      sale(500_000, -10),
      sale(250_000, -45),
      sale(100_000, -100),
      sale(0, -100),
      sale(50_000, null),
    ]);

    expect(aging.current).toBe(1_000_000);
    expect(aging.d0_30).toBe(500_000);
    expect(aging.d31_60).toBe(250_000);
    expect(aging.d60plus).toBe(100_000);
    expect(aging.undated).toBe(50_000);
    expect(aging.total).toBe(1_900_000);
  });
});

describe('commissionAmount', () => {
  it('computes percentages of the agreed price', () => {
    const amount = commissionAmount(new D(2_450_000), 'PERCENT', 5);
    expect(amount.toString()).toBe('122500');
  });

  it('rounds percentages to cents', () => {
    const amount = commissionAmount(new D(1_000_000), 'PERCENT', 2.5);
    expect(amount.toString()).toBe('25000');
  });

  it('passes fixed amounts through', () => {
    expect(commissionAmount(new D(2_450_000), 'FIXED', null, 150_000).toString()).toBe(
      '150000'
    );
  });
});

describe('commissionTotals', () => {
  it('splits paid from unpaid', () => {
    const totals = commissionTotals([
      commission(100_000, 'PENDING'),
      commission(50_000, 'PARTIAL'),
      commission(25_000, 'PAID'),
    ]);

    expect(totals.expected).toBe(175_000);
    expect(totals.unpaid).toBe(150_000);
    expect(totals.paid).toBe(25_000);
    expect(totals.count).toBe(3);
  });
});
