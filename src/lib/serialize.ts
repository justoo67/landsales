import type {
  BuyerReview,
  Commission,
  PaymentInstallment,
  Plot,
  SaleRecord,
} from '@prisma/client';
import { serializeMoney } from './money.server';
import { commissionJson } from './finance';

/**
 * JSON projections for Prisma money columns.
 *
 * Prisma `Decimal` serialises to a string through `JSON.stringify`, which
 * silently breaks every client-side calculation. Every route that returns a
 * Plot or SaleRecord must use these helpers.
 */

export function installmentJson(installment: PaymentInstallment) {
  return {
    ...installment,
    amountKes: serializeMoney(installment.amountKes) ?? 0,
  };
}

export type SaleRecordWithRelations = SaleRecord & {
  installments?: PaymentInstallment[];
  review?: BuyerReview | null;
  commission?: Commission | null;
};

export function saleRecordJson(deal: SaleRecordWithRelations) {
  const { installments, review, commission, ...rest } = deal;

  return {
    ...rest,
    agreedPriceKes: serializeMoney(rest.agreedPriceKes) ?? 0,
    depositKes: serializeMoney(rest.depositKes) ?? 0,
    balanceKes: serializeMoney(rest.balanceKes) ?? 0,
    ...(installments ? { installments: installments.map(installmentJson) } : {}),
    ...(review !== undefined ? { review } : {}),
    ...(commission !== undefined ? { commission: commissionJson(commission) } : {}),
  };
}

function omitKeys<T extends Record<string, unknown>, K extends string>(
  source: T,
  keys: readonly K[]
): Omit<T, K> {
  const clone = { ...source };
  for (const key of keys) {
    delete clone[key];
  }
  return clone as Omit<T, K>;
}

export function plotJson(
  plot: Plot & { saleRecord?: SaleRecordWithRelations | null }
) {
  const { priceKes, saleRecord, ...rest } = plot;

  return {
    ...omitKeys(rest as Record<string, unknown>, ['deletedAt']),
    priceKes: serializeMoney(priceKes),
    ...(saleRecord !== undefined
      ? { saleRecord: saleRecord ? saleRecordJson(saleRecord) : null }
      : {}),
  };
}
