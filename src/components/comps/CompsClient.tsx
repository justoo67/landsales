'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Landmark,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { formatKes } from '@/lib/money';
import { triggerHaptic } from '@/lib/haptics';
import { formatAcres } from '@/lib/units';

interface CompRow {
  id: string;
  county: string;
  ward: string | null;
  locationName: string;
  sizeAcres: number;
  priceKes: number;
  pricePerAcre: number;
  kind: string;
  source: string;
  verified: boolean;
  observedAt: string;
  notes: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
  AGENT: 'Own record',
  PORTAL: 'Listing portal',
  PUBLIC_RECORD: 'Public record',
  HEARD: 'Heard on the ground',
};

function todayInput(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function CompsClient() {
  const [comps, setComps] = useState<CompRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    county: '',
    ward: '',
    locationName: '',
    sizeAcres: '',
    priceKes: '',
    kind: 'SALE',
    source: 'AGENT',
    observedAt: todayInput(),
    verified: false,
    notes: '',
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/comps');
      if (res.ok) {
        const data = await res.json();
        setComps(data.comps || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!query.trim()) return comps;
    const term = query.trim().toLowerCase();
    return comps.filter(
      (comp) =>
        comp.locationName.toLowerCase().includes(term) ||
        comp.county.toLowerCase().includes(term) ||
        (comp.ward || '').toLowerCase().includes(term)
    );
  }, [comps, query]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/comps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not save this comparable');
        return;
      }

      setComps((current) => [data.comp, ...current]);
      setSheetOpen(false);
      setForm((current) => ({
        ...current,
        locationName: '',
        sizeAcres: '',
        priceKes: '',
        notes: '',
        verified: false,
      }));
      triggerHaptic('success');
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/comps/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setComps((current) => current.filter((comp) => comp.id !== id));
      triggerHaptic('warning');
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Comparables
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {comps.length} recorded · price guidance uses the latest nearby sales
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search location or county"
              aria-label="Search comparables"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
          </div>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl shadow-sm min-h-[44px] flex-shrink-0 touch-manipulation"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add comp</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-xs">Loading comparables…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <Landmark className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {query ? 'No comps match that search' : 'No comparables yet'}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
            Record the price per acre of nearby plots you know about — a sale you handled, a
            neighbour&apos;s deal, a portal listing. Two comps in the same ward are enough to
            start.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((comp) => (
            <div
              key={comp.id}
              className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {comp.locationName}
                    </p>
                    {comp.verified && (
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {comp.ward ? `${comp.ward}, ` : ''}
                    {comp.county} · {formatAcres(comp.sizeAcres)} ·{' '}
                    {comp.kind === 'SALE' ? 'Sale' : 'Listing'} ·{' '}
                    {SOURCE_LABELS[comp.source] || comp.source}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(comp.observedAt).toLocaleDateString('en-KE', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-900">{formatKes(comp.priceKes)}</p>
                  <p className="text-[11px] font-semibold text-sky-700">
                    {formatKes(comp.pricePerAcre)}/acre
                  </p>
                </div>
              </div>

              {comp.notes && (
                <p className="mt-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2">
                  {comp.notes}
                </p>
              )}

              <button
                type="button"
                onClick={() => remove(comp.id)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-rose-600 py-1 touch-manipulation"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {sheetOpen && (
        <div className="fixed inset-0 z-[1200] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] overflow-y-auto pb-safe">
            <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-slate-100 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Add comparable</h2>
                <p className="text-[11px] text-slate-500">A nearby plot price you trust</p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
                className="w-10 h-10 -mr-2 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.county}
                  onChange={(event) => setForm({ ...form, county: event.target.value })}
                  placeholder="County *"
                  aria-label="County"
                  className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-base focus:outline-none"
                />
                <input
                  value={form.ward}
                  onChange={(event) => setForm({ ...form, ward: event.target.value })}
                  placeholder="Ward"
                  aria-label="Ward"
                  className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-base focus:outline-none"
                />
              </div>

              <input
                value={form.locationName}
                onChange={(event) => setForm({ ...form, locationName: event.target.value })}
                placeholder="Location, e.g. Ngong Ridge *"
                aria-label="Location name"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-base focus:outline-none"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.sizeAcres}
                  onChange={(event) => setForm({ ...form, sizeAcres: event.target.value })}
                  inputMode="decimal"
                  placeholder="Size (acres) *"
                  aria-label="Size in acres"
                  className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-base focus:outline-none"
                />
                <input
                  value={form.priceKes}
                  onChange={(event) => setForm({ ...form, priceKes: event.target.value })}
                  inputMode="numeric"
                  placeholder="Price (KES) *"
                  aria-label="Price in KES"
                  className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-base focus:outline-none"
                />
              </div>

              {form.sizeAcres && form.priceKes && Number(form.sizeAcres) > 0 && (
                <p className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-2">
                  {formatKes(
                    Number(String(form.priceKes).replace(/[^0-9.]/g, '')) /
                      Number(form.sizeAcres)
                  )}{' '}
                  per acre
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.kind}
                  onChange={(event) => setForm({ ...form, kind: event.target.value })}
                  aria-label="Sale or listing"
                  className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-base focus:outline-none"
                >
                  <option value="SALE">Sale</option>
                  <option value="LISTING">Asking price</option>
                </select>
                <select
                  value={form.source}
                  onChange={(event) => setForm({ ...form, source: event.target.value })}
                  aria-label="Source"
                  className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-base focus:outline-none"
                >
                  {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="date"
                value={form.observedAt}
                onChange={(event) => setForm({ ...form, observedAt: event.target.value })}
                aria-label="Observation date"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-base focus:outline-none"
              />

              <textarea
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                rows={2}
                placeholder="Notes — access, utilities, why it sold at that price"
                aria-label="Notes"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-base focus:outline-none"
              />

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 py-1">
                <input
                  type="checkbox"
                  checked={form.verified}
                  onChange={(event) => setForm({ ...form, verified: event.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                I verified this price myself
              </label>

              {error && (
                <p className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-2xl min-h-[48px] disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save comparable'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
