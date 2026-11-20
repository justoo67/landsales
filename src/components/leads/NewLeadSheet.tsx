'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { formatKes } from '@/lib/money';
import { triggerHaptic } from '@/lib/haptics';
import { LEAD_SOURCES, SOURCE_LABELS } from '@/lib/lead-stages';
import type { LeadRecord, PlotOption } from '@/lib/lead-types';

interface NewLeadSheetProps {
  plots: PlotOption[];
  defaultPlotId?: string;
  onClose: () => void;
  onCreated: (lead: LeadRecord) => void;
}

export default function NewLeadSheet({
  plots,
  defaultPlotId,
  onClose,
  onCreated,
}: NewLeadSheetProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plotId, setPlotId] = useState(defaultPlotId || '');
  const [budget, setBudget] = useState('');
  const [source, setSource] = useState('FIELD');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !phone.trim()) {
      setError('Name and phone number are required.');
      triggerHaptic('warning');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          plotId: plotId || null,
          source,
          budgetMaxKes: budget || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not save this lead.');
        triggerHaptic('warning');
        return;
      }

      triggerHaptic('success');
      onCreated(data.lead);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] overflow-y-auto pb-safe">
        <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">New Lead</h2>
            <p className="text-[11px] text-slate-500">Someone interested in buying land</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label htmlFor="lead-name" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Buyer name
            </label>
            <input
              id="lead-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              placeholder="e.g. Peter Kamau"
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400"
            />
          </div>

          <div>
            <label htmlFor="lead-phone" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Phone number
            </label>
            <input
              id="lead-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0712 345 678"
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Saved as a WhatsApp-ready international number.
            </p>
          </div>

          <div>
            <label htmlFor="lead-plot" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Plot of interest
            </label>
            <select
              id="lead-plot"
              value={plotId}
              onChange={(event) => setPlotId(event.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400"
            >
              <option value="">Not sure yet</option>
              {plots.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.title}
                  {plot.priceKes ? ` — ${formatKes(plot.priceKes)}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lead-budget" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Budget ceiling (optional)
            </label>
            <input
              id="lead-budget"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              inputMode="numeric"
              placeholder="1,500,000"
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-600 mb-1.5">
              Where did they come from?
            </span>
            <div className="flex flex-wrap gap-1.5">
              {LEAD_SOURCES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSource(option)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors min-h-[36px] ${
                    source === option
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {SOURCE_LABELS[option] || option}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="pt-1 space-y-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-2xl shadow-md shadow-sky-600/20 transition-all min-h-[48px] touch-manipulation disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Saving...' : 'Save Lead'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-2xl transition-all min-h-[44px] touch-manipulation"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
