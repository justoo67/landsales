'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2, TrendingUp } from 'lucide-react';
import { formatKes } from '@/lib/money';
import { formatAcres } from '@/lib/units';

interface GuidanceComp {
  id: string;
  locationName: string;
  sizeAcres: number;
  priceKes: number;
  pricePerAcre: number;
  kind: string;
  observedAt: string;
}

interface GuidanceResponse {
  targetAcres: number | null;
  asking: number | null;
  askingPerAcre: number | null;
  deviation: number | null;
  scope: 'WARD' | 'COUNTY' | null;
  guidance: {
    low: number;
    mid: number;
    high: number;
    count: number;
    comps: GuidanceComp[];
  } | null;
  reason: string | null;
}

const REASON_COPY: Record<string, string> = {
  NO_LOCATION: 'Add a county (and ward) to this plot to match comparable sales.',
  NO_SIZE: 'This plot size could not be converted to acres, so guidance is unavailable.',
  NOT_ENOUGH_COMPS: 'Record at least two nearby comparables to get a price range.',
};

export default function PriceGuidance({
  plotId,
  asking,
}: {
  plotId: string;
  asking: number | null;
}) {
  const [data, setData] = useState<GuidanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/plots/${plotId}/guidance`);
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [plotId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-2 text-xs text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking comparable sales…
      </section>
    );
  }

  if (!data) return null;

  if (!data.guidance) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" />
          Price guidance
        </h3>
        <p className="text-xs text-slate-500">
          {REASON_COPY[data.reason || ''] || 'Not enough data for a range yet.'}
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/comps"
            className="text-[11px] font-semibold text-sky-600 hover:text-sky-800"
          >
            Add comparables →
          </Link>
          {data.askingPerAcre && (
            <span className="text-[11px] text-slate-500">
              This plot asks {formatKes(data.askingPerAcre)}/acre
            </span>
          )}
        </div>
      </section>
    );
  }

  const { guidance } = data;
  const off = data.deviation;
  const isOff = off !== null && Math.abs(off) > 25;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" />
          Price guidance
        </h3>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          {data.scope === 'WARD' ? 'Ward comps' : 'County comps'} · {guidance.count}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 border border-slate-100 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Low
          </span>
          <span className="text-xs font-bold text-slate-700 block mt-0.5">
            {formatKes(guidance.low)}
          </span>
        </div>
        <div className="rounded-xl bg-sky-50 border border-sky-200 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 block">
            Mid
          </span>
          <span className="text-sm font-extrabold text-sky-800 block mt-0.5">
            {formatKes(guidance.mid)}
          </span>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            High
          </span>
          <span className="text-xs font-bold text-slate-700 block mt-0.5">
            {formatKes(guidance.high)}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 text-center">
        Per acre, from {guidance.count} comparable{guidance.count === 1 ? '' : 's'} · plot is{' '}
        {formatAcres(data.targetAcres)}
      </p>

      {isOff && off !== null && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-900 leading-relaxed">
            This asking price is <strong>{Math.abs(off)}%</strong>{' '}
            {off > 0 ? 'above' : 'below'} the comp mid-point
            {asking ? ` (${formatKes(asking)})` : ''}. Check the comps before quoting.
          </p>
        </div>
      )}

      <details className="group">
        <summary className="cursor-pointer text-[11px] font-semibold text-sky-700 list-none">
          Show the comps used
        </summary>
        <ul className="mt-2 divide-y divide-slate-100">
          {guidance.comps.map((comp) => (
            <li key={comp.id} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-700 truncate">
                  {comp.locationName}
                </p>
                <p className="text-[10px] text-slate-400">
                  {formatAcres(comp.sizeAcres)} ·{' '}
                  {comp.kind === 'SALE' ? 'sale' : 'asking'} ·{' '}
                  {new Date(comp.observedAt).toLocaleDateString('en-KE', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-700 flex-shrink-0">
                {formatKes(comp.pricePerAcre)}/ac
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
