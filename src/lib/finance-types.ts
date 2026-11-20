/** Money vocabulary, safe to import from client components. */

export const PAYMENT_METHODS = ['MPESA', 'BANK', 'CASH', 'CHEQUE'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  MPESA: 'M-Pesa',
  BANK: 'Bank transfer',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
};

export function isPaymentMethod(value: string): value is PaymentMethod {
  return PAYMENT_METHODS.some((method) => method === value);
}

export const COMMISSION_BASES = ['PERCENT', 'FIXED'] as const;
export type CommissionBasis = (typeof COMMISSION_BASES)[number];

export const COMMISSION_STATUSES = [
  'PENDING',
  'INVOICED',
  'PARTIAL',
  'PAID',
] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export const COMMISSION_STATUS_STYLES: Record<CommissionStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  INVOICED: 'bg-sky-50 text-sky-700 border-sky-200',
  PARTIAL: 'bg-orange-50 text-orange-700 border-orange-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  PENDING: 'Pending',
  INVOICED: 'Invoiced',
  PARTIAL: 'Part paid',
  PAID: 'Paid',
};

export interface AgingBuckets {
  /** Not yet due. */
  current: number;
  /** 0–30 days past the due date. */
  d0_30: number;
  d31_60: number;
  d60plus: number;
  /** Balance with no due date recorded. */
  undated: number;
  total: number;
}

export type AgingKey = Exclude<keyof AgingBuckets, 'total'>;

export function agingBucket(
  dueDate: string | Date | null | undefined,
  now = new Date()
): AgingKey {
  if (!dueDate) return 'undated';

  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  if (Number.isNaN(due.getTime())) return 'undated';

  const days = Math.floor((now.getTime() - due.getTime()) / 86_400_000);
  if (days < 0) return 'current';
  if (days <= 30) return 'd0_30';
  if (days <= 60) return 'd31_60';
  return 'd60plus';
}

export const AGING_LABELS: Record<AgingKey, string> = {
  current: 'Not due',
  d0_30: '0–30 days',
  d31_60: '31–60 days',
  d60plus: '60+ days',
  undated: 'No due date',
};
