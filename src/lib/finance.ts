import type { Commission, PaymentInstallment, SaleRecord } from '@prisma/client';
import { D, serializeMoney, sumDecimals } from './money.server';
import { agingBucket, type AgingBuckets } from './finance-types';

export * from './finance-types';

/** Commission amount for a percent or fixed basis. */
export function commissionAmount(
  agreedPrice: import('@prisma/client').Prisma.Decimal,
  basis: string,
  ratePercent?: number | null,
  fixedAmount?: number | null
) {
  if (basis === 'PERCENT') {
    const rate = new D(ratePercent ?? 0);
    return agreedPrice.mul(rate).div(100).toDecimalPlaces(2);
  }
  return new D(fixedAmount ?? 0).toDecimalPlaces(2);
}

export type SaleWithMoney = SaleRecord & {
  installments?: PaymentInstallment[];
  commission?: Commission | null;
};

export function commissionJson(commission: Commission | null | undefined) {
  if (!commission) return null;
  return {
    ...commission,
    ratePercent: serializeMoney(commission.ratePercent),
    amountKes: serializeMoney(commission.amountKes),
  };
}

export function paymentJson(payment: PaymentInstallment) {
  return { ...payment, amountKes: serializeMoney(payment.amountKes) ?? 0 };
}

/** Total paid across a sale's installments. */
export function totalPaid(installments: PaymentInstallment[]) {
  return sumDecimals(installments.map((payment) => payment.amountKes));
}

/**
 * Receivables aging, by sale-level balance and next due date.
 *
 * Uses the stored `balanceKes` (kept current by the payments route) rather than
 * recomputing from installments, so a statement and the dashboard always agree.
 */
export function receivablesAging(sales: SaleWithMoney[], now = new Date()): AgingBuckets {
  const buckets: AgingBuckets = {
    current: 0,
    d0_30: 0,
    d31_60: 0,
    d60plus: 0,
    undated: 0,
    total: 0,
  };

  for (const sale of sales) {
    const balance = Number(sale.balanceKes);
    if (!balance || balance <= 0) continue;

    const key = agingBucket(sale.nextDueDate, now);
    buckets[key] += balance;
    buckets.total += balance;
  }

  for (const key of Object.keys(buckets) as Array<keyof AgingBuckets>) {
    buckets[key] = Math.round(buckets[key]);
  }

  return buckets;
}

export function commissionTotals(commissions: Commission[]) {
  const pending = commissions.filter((item) => item.status !== 'PAID');
  return {
    expected: Math.round(Number(sumDecimals(commissions.map((c) => c.amountKes)))),
    unpaid: Math.round(Number(sumDecimals(pending.map((c) => c.amountKes)))),
    paid: Math.round(
      Number(sumDecimals(commissions.filter((c) => c.status === 'PAID').map((c) => c.amountKes)))
    ),
    count: commissions.length,
  };
}
