import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession, ensureAgentForSession } from '@/lib/auth';
import { formatKes } from '@/lib/money';
import { serializeMoney } from '@/lib/money.server';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/lib/finance-types';
import PrintButton from '@/components/pricing/PrintButton';

const STAGE_LABELS: Record<string, string> = {
  DEPOSIT_PAID: 'Deposit paid',
  AGREEMENT_SIGNED: 'Sale agreement signed',
  BALANCE_CLEARED: 'Balance cleared',
  LCB_CONSENT: 'LCB consent obtained',
  TITLE_ISSUED: 'Title deed issued',
};

export default async function StatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { id } = await params;
  const agent = await ensureAgentForSession(session);

  const plot = await prisma.plot.findFirst({
    where: { id, deletedAt: null, agentId: agent.id },
    include: {
      saleRecord: {
        include: { installments: { orderBy: { paymentDate: 'asc' } } },
      },
    },
  });

  if (!plot) {
    notFound();
  }

  if (!plot.saleRecord) {
    return (
      <div className="min-h-dvh bg-slate-100 p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <h1 className="text-lg font-bold text-slate-900">No sale recorded</h1>
          <p className="text-xs text-slate-500 mt-1">
            Record the deposit on this plot before generating a statement.
          </p>
          <Link
            href={`/dashboard/plots/${plot.id}/edit`}
            className="inline-block mt-4 text-xs font-semibold text-sky-600"
          >
            Back to plot
          </Link>
        </div>
      </div>
    );
  }

  const sale = plot.saleRecord;

  const paid = sale.installments.reduce(
    (sum, payment) => sum + (serializeMoney(payment.amountKes) ?? 0),
    0
  );
  const balance = serializeMoney(sale.balanceKes) ?? 0;
  const agreed = serializeMoney(sale.agreedPriceKes) ?? 0;

  return (
    <div className="min-h-dvh bg-slate-100 py-6 px-4 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Link
            href={`/dashboard/plots/${plot.id}/edit`}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            ← Back to plot
          </Link>
          <PrintButton />
        </div>

        <article className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10 print:shadow-none print:border-0 print:rounded-none print:p-0">
          <header className="flex items-start justify-between gap-6 pb-6 border-b-2 border-slate-900">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Statement of account
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mt-1">
                {plot.title}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {[plot.locationName, plot.ward, plot.county].filter(Boolean).join(' · ') ||
                  'Location on request'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Prepared
              </p>
              <p className="text-xs font-semibold text-slate-700">
                {new Date().toLocaleDateString('en-KE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                {agent?.agentName || session.name}
              </p>
              <p className="text-[11px] text-slate-500">{agent?.whatsappNumber}</p>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-6 py-6 border-b border-slate-200">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Buyer
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{sale.buyerName}</p>
              <p className="text-xs text-slate-500">{sale.buyerPhone}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Sale progress
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                {STAGE_LABELS[sale.titleStatus] || sale.titleStatus}
              </p>
              <p className="text-xs text-slate-500">
                {sale.nextDueDate
                  ? `Next payment due ${new Date(sale.nextDueDate).toLocaleDateString('en-KE', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}`
                  : 'No further date scheduled'}
              </p>
            </div>
          </section>

          <section className="py-6 border-b border-slate-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Payments received
            </p>

            {sale.installments.length === 0 ? (
              <p className="text-xs text-slate-500">No payments recorded yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                    <th className="py-1.5 font-semibold">Date</th>
                    <th className="py-1.5 font-semibold">Method</th>
                    <th className="py-1.5 font-semibold">Reference</th>
                    <th className="py-1.5 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.installments.map((payment) => (
                    <tr key={payment.id} className="border-b border-slate-100">
                      <td className="py-2 text-slate-700">
                        {new Date(payment.paymentDate).toLocaleDateString('en-KE', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-2 text-slate-700">
                        {PAYMENT_METHOD_LABELS[payment.method as PaymentMethod] ||
                          payment.method}
                      </td>
                      <td className="py-2 text-slate-500 font-mono">
                        {payment.reference || '—'}
                      </td>
                      <td className="py-2 text-right font-semibold text-slate-900">
                        {formatKes(serializeMoney(payment.amountKes) ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="py-6">
            <div className="ml-auto w-full sm:w-2/3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Agreed price</span>
                <span className="font-semibold text-slate-900">{formatKes(agreed)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total received</span>
                <span className="font-semibold text-emerald-700">{formatKes(paid)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-300 pt-2">
                <span className="font-bold text-slate-900">Balance due</span>
                <span className="font-extrabold text-slate-900 text-base">
                  {formatKes(balance)}
                </span>
              </div>
            </div>
          </section>

          <footer className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 leading-relaxed">
            Statement generated from recorded payments. Please confirm any discrepancy with the
            agent within seven days.
          </footer>
        </article>
      </div>
    </div>
  );
}
