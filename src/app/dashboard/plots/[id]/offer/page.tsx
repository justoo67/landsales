import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession, ensureAgentForSession } from '@/lib/auth';
import { formatKes } from '@/lib/money';
import { acresFromPreset, formatAcres, pricePerAcre } from '@/lib/units';
import PrintButton from '@/components/pricing/PrintButton';

export default async function OfferSheetPage({
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
  });

  if (!plot) {
    notFound();
  }

  const acres = acresFromPreset(plot.sizePreset, plot.sizeCustomValue);
  const price = plot.priceKes ? Number(plot.priceKes) : null;
  const perAcre = price ? pricePerAcre(price, acres) : null;
  const today = new Date().toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
                Land sale offer
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
              <p className="text-xs font-semibold text-slate-700">{today}</p>
              <p className="text-[11px] text-slate-500 mt-2">
                {agent?.agentName || session.name}
              </p>
              <p className="text-[11px] text-slate-500">{agent?.whatsappNumber}</p>
            </div>
          </header>

          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-6 border-b border-slate-200">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Size
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                {plot.sizePreset === 'CUSTOM'
                  ? plot.sizeCustomValue || '—'
                  : plot.sizePreset}
              </p>
              <p className="text-[10px] text-slate-500">{formatAcres(acres)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Zoning
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                {plot.zoning || '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Road access
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                {plot.roadAccess || '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Utilities
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                {[plot.waterSource, plot.electricity].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
          </section>

          <section className="py-6 border-b border-slate-200">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Offer price
                </p>
                <p className="text-3xl font-extrabold tracking-tight text-slate-900 mt-0.5">
                  {price ? formatKes(price) : 'Price on request'}
                </p>
              </div>
              {perAcre && (
                <p className="text-xs text-slate-500">
                  {formatKes(perAcre)} per acre
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Deposit
                </p>
                <p className="text-sm text-slate-700 mt-1 border-b border-dashed border-slate-300 pb-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Balance due
                </p>
                <p className="text-sm text-slate-700 mt-1 border-b border-dashed border-slate-300 pb-5" />
              </div>
            </div>
          </section>

          {plot.description && (
            <section className="py-6 border-b border-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Property notes
              </p>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {plot.description}
              </p>
            </section>
          )}

          <section className="grid grid-cols-2 gap-8 pt-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Buyer
              </p>
              <p className="text-xs text-slate-500 mt-6 border-b border-slate-300 pb-1">
                Name &amp; signature
              </p>
              <p className="text-xs text-slate-500 mt-6 border-b border-slate-300 pb-1">
                Phone
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Agent
              </p>
              <p className="text-xs text-slate-500 mt-6 border-b border-slate-300 pb-1">
                {agent?.agentName || session.name}
              </p>
              <p className="text-xs text-slate-500 mt-6 border-b border-slate-300 pb-1">
                Date
              </p>
            </div>
          </section>

          <footer className="mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-400 leading-relaxed">
            This document records the terms discussed and is not a transfer instrument. Title,
            survey, and conveyancing are completed by the respective professionals.
          </footer>
        </article>
      </div>
    </div>
  );
}
