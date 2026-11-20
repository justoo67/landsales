'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, Loader2, Receipt, Wallet } from 'lucide-react';
import { formatKes } from '@/lib/money';
import { whatsappNumber } from '@/lib/phone';
import { dueLabel } from '@/lib/format';
import {
  AGING_LABELS,
  COMMISSION_STATUS_LABELS,
  COMMISSION_STATUS_STYLES,
  type AgingBuckets,
  type CommissionStatus,
} from '@/lib/finance-types';

interface DealRow {
  id: string;
  plotId: string;
  buyerName: string;
  buyerPhone: string;
  agreedPriceKes: number;
  balanceKes: number;
  nextDueDate: string | null;
  titleStatus: string;
  plot: { id: string; title: string } | null;
  commission?: {
    id: string;
    amountKes: number;
    status: string;
    dueDate: string | null;
  } | null;
}

interface FinancePayload {
  receivables: AgingBuckets;
  commission: { expected: number; unpaid: number; paid: number; count: number };
}

export default function MoneyClient() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [finance, setFinance] = useState<FinancePayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/deals');
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals || []);
        setFinance(data.finance || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const receivables = useMemo(
    () =>
      deals
        .filter((deal) => deal.balanceKes > 0)
        .sort((a, b) => {
          const aTime = a.nextDueDate ? new Date(a.nextDueDate).getTime() : Infinity;
          const bTime = b.nextDueDate ? new Date(b.nextDueDate).getTime() : Infinity;
          return aTime - bTime;
        }),
    [deals]
  );

  const commissions = useMemo(
    () =>
      deals
        .filter((deal) => deal.commission)
        .sort((a, b) => (b.commission?.amountKes ?? 0) - (a.commission?.amountKes ?? 0)),
    [deals]
  );

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-xs">Loading the books…</span>
      </div>
    );
  }

  const aging = finance?.receivables;

  return (
    <>
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Money</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          What buyers still owe you, and what you have earned
        </p>
      </div>

      {aging && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
          {(['current', 'd0_30', 'd31_60', 'd60plus'] as const).map((key) => (
            <div
              key={key}
              className={`rounded-2xl border p-3 ${
                key === 'd60plus' && aging[key] > 0
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {AGING_LABELS[key]}
              </span>
              <span
                className={`text-sm font-extrabold block mt-0.5 ${
                  key === 'd60plus' && aging[key] > 0 ? 'text-rose-700' : 'text-slate-900'
                }`}
              >
                {formatKes(aging[key])}
              </span>
            </div>
          ))}
        </div>
      )}

      {finance && (
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Commission expected
            </span>
            <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
              {formatKes(finance.commission.expected)}
            </span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
              Unpaid
            </span>
            <span className="text-sm font-extrabold text-amber-800 block mt-0.5">
              {formatKes(finance.commission.unpaid)}
            </span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
              Paid
            </span>
            <span className="text-sm font-extrabold text-emerald-800 block mt-0.5">
              {formatKes(finance.commission.paid)}
            </span>
          </div>
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
          <Receipt className="w-3.5 h-3.5" />
          Outstanding balances ({receivables.length})
        </h2>

        {receivables.length === 0 ? (
          <p className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
            Nothing outstanding. Every sale is fully paid.
          </p>
        ) : (
          <ul className="space-y-2">
            {receivables.map((deal) => (
              <li
                key={deal.id}
                className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {deal.plot?.title || 'Plot'}
                    </p>
                    <p className="text-[11px] text-slate-500">{deal.buyerName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {deal.nextDueDate
                        ? `Next due ${dueLabel(deal.nextDueDate)}`
                        : 'No due date recorded'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-extrabold text-slate-900">
                      {formatKes(deal.balanceKes)}
                    </p>
                    <div className="flex flex-col items-end gap-1 mt-1">
                      <Link
                        href={`/dashboard/plots/${deal.plotId}/statement`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-800"
                      >
                        <FileText className="w-3 h-3" />
                        Statement
                      </Link>
                      <a
                        href={`https://wa.me/${whatsappNumber(deal.buyerPhone)}?text=${encodeURIComponent(
                          `Hi ${deal.buyerName.split(' ')[0]}, your balance on "${deal.plot?.title || 'the plot'}" is ${formatKes(deal.balanceKes)}${
                            deal.nextDueDate ? `, due ${dueLabel(deal.nextDueDate).replace(' · ', ' ')}` : ''
                          }. Thank you.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-800"
                      >
                        Remind
                      </a>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" />
          Commission ({commissions.length})
        </h2>

        {commissions.length === 0 ? (
          <p className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
            No commission recorded yet. Open a sale ledger and add it on the Commission tab.
          </p>
        ) : (
          <ul className="space-y-2">
            {commissions.map((deal) => {
              const status = (deal.commission?.status || 'PENDING') as CommissionStatus;
              return (
                <li
                  key={deal.id}
                  className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {deal.plot?.title || 'Plot'}
                    </p>
                    <p className="text-[11px] text-slate-500">{deal.buyerName}</p>
                    <span
                      className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
                        COMMISSION_STATUS_STYLES[status]
                      }`}
                    >
                      {COMMISSION_STATUS_LABELS[status]}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-extrabold text-slate-900">
                      {formatKes(deal.commission?.amountKes ?? 0)}
                    </p>
                    <Link
                      href={`/dashboard/plots/${deal.plotId}/statement`}
                      className="text-[11px] font-semibold text-sky-600 hover:text-sky-800"
                    >
                      View sale
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
