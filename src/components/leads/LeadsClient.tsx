'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Plus, Search, Users } from 'lucide-react';
import LeadBoard from '@/components/leads/LeadBoard';
import LeadDetailSheet from '@/components/leads/LeadDetailSheet';
import NewLeadSheet from '@/components/leads/NewLeadSheet';
import { triggerHaptic } from '@/lib/haptics';
import { OPEN_STAGES, type LeadStage } from '@/lib/lead-stages';
import type { LeadRecord, PlotOption } from '@/lib/lead-types';

export default function LeadsClient({
  initialPlotId,
}: {
  initialPlotId?: string | null;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [plots, setPlots] = useState<PlotOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/leads');
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error('Fetch leads error:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchLeads();
    fetch('/api/plots')
      .then((res) => (res.ok ? res.json() : { plots: [] }))
      .then((data) => setPlots(data.plots || []))
      .catch(() => setPlots([]));
  }, [fetchLeads, router]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  const filtered = useMemo(() => {
    const scoped = initialPlotId
      ? leads.filter((lead) => lead.plot?.id === initialPlotId)
      : leads;
    if (!query.trim()) return scoped;
    const term = query.trim().toLowerCase();
    return scoped.filter(
      (lead) =>
        lead.contact.name.toLowerCase().includes(term) ||
        lead.contact.phone.includes(term) ||
        (lead.plot?.title || '').toLowerCase().includes(term)
    );
  }, [leads, query, initialPlotId]);

  const plotFilter = plots.find((plot) => plot.id === initialPlotId);

  const openCount = leads.filter((lead) =>
    OPEN_STAGES.includes(lead.stage as LeadStage)
  ).length;
  const newThisWeek = leads.filter(
    (lead) => Date.now() - new Date(lead.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
  ).length;

  const handleStageChange = async (id: string, stage: string) => {
    const previous = leads;
    setLeads((current) =>
      current.map((lead) => (lead.id === id ? { ...lead, stage } : lead))
    );

    try {
      const res = await fetch(`/api/leads/${id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLeads(previous);
        triggerHaptic('warning');
        showToast(data.error || 'Could not move this lead');
        return;
      }

      triggerHaptic('light');
      const data = await res.json();
      setLeads((current) =>
        current.map((lead) => (lead.id === id ? { ...lead, ...data.lead } : lead))
      );
    } catch {
      setLeads(previous);
      showToast('Network error while moving the lead');
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Leads
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {openCount} active · {newThisWeek} new this week
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, phone, plot"
              aria-label="Search leads"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all touch-manipulation active:scale-95 min-h-[44px] flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New lead</span>
          </button>
        </div>
      </div>

      {initialPlotId && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-sky-50 border border-sky-200 rounded-2xl px-3.5 py-2.5">
          <p className="text-xs text-sky-900 min-w-0 truncate">
            Showing buyers for{' '}
            <strong className="font-semibold">{plotFilter?.title || 'this plot'}</strong>
          </p>
          <Link
            href="/dashboard/leads"
            className="text-xs font-semibold text-sky-700 hover:text-sky-900 flex-shrink-0 touch-manipulation"
          >
            Show all
          </Link>
        </div>
      )}

      {loading ? (
        <div className="py-24 flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-xs">Loading pipeline…</span>
        </div>
      ) : filtered.length === 0 && query ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center">
          <Users className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No leads match “{query}”</p>
          <p className="text-xs text-slate-500 mt-1">Try a name, phone number, or plot.</p>
        </div>
      ) : (
        <LeadBoard
          leads={filtered}
          onSelect={setSelectedId}
          onStageChange={handleStageChange}
          onNewLead={() => setShowNew(true)}
        />
      )}

      {showNew && (
        <NewLeadSheet
          plots={plots}
          defaultPlotId={initialPlotId ?? undefined}
          onClose={() => setShowNew(false)}
          onCreated={(lead) => {
            setLeads((current) => [lead, ...current]);
            setShowNew(false);
            setSelectedId(lead.id);
          }}
        />
      )}

      {selectedId && (
        <LeadDetailSheet
          leadId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={fetchLeads}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[1200] max-w-sm w-[calc(100%-2rem)]">
          <div className="bg-slate-900 text-white text-xs font-medium rounded-2xl px-4 py-3 shadow-xl">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
