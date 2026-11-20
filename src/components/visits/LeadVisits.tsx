'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarPlus, Check, Loader2, Star, UserX } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { dueLabel, toDateTimeInput } from '@/lib/format';
import {
  VISIT_STATUS_LABELS,
  VISIT_STATUS_STYLES,
  type VisitItem,
  type VisitStatus,
} from '@/lib/visits';

interface LeadVisitsProps {
  leadId: string;
  stage?: string;
  onOffer?: () => void;
  onChanged?: () => void;
}

function defaultSlot(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return toDateTimeInput(date);
}

export default function LeadVisits({ leadId, stage, onOffer, onChanged }: LeadVisitsProps) {
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduledAt, setScheduledAt] = useState(defaultSlot);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/visits?leadId=${encodeURIComponent(leadId)}`);
      if (res.ok) {
        const data = await res.json();
        setVisits(data.visits || []);
      }
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  const schedule = async () => {
    if (!scheduledAt) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, scheduledAt: new Date(scheduledAt).toISOString() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not schedule the visit');
        return;
      }

      triggerHaptic('success');
      await load();
      onChanged?.();
    } catch {
      setError('Network error while scheduling');
    } finally {
      setSaving(false);
    }
  };

  const update = async (
    visit: VisitItem,
    status: VisitStatus,
    extra?: { rating?: number; feedback?: string }
  ) => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/visits/${visit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extra }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not update the visit');
        return;
      }

      triggerHaptic('success');
      setCompletingId(null);
      setFeedback('');
      setRating(5);
      await load();
      onChanged?.();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        <CalendarPlus className="w-3.5 h-3.5" />
        Site visits
      </h3>

      {loading ? (
        <div className="py-3 flex justify-center text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : (
        <ul className="space-y-2">
          {visits.length === 0 && (
            <li className="text-xs text-slate-400">No visits scheduled yet.</li>
          )}
          {visits.map((visit) => {
            const style =
              VISIT_STATUS_STYLES[visit.status as VisitStatus] ??
              VISIT_STATUS_STYLES.SCHEDULED;

            return (
              <li
                key={visit.id}
                className="border border-slate-200 rounded-xl px-3 py-2.5 bg-white"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    {dueLabel(visit.scheduledAt)}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${style}`}
                  >
                    {VISIT_STATUS_LABELS[visit.status as VisitStatus] || visit.status}
                  </span>
                </div>

                {visit.feedback && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    {visit.feedback}
                    {visit.rating ? ` · ${visit.rating}/5` : ''}
                  </p>
                )}

                {visit.status === 'SCHEDULED' && completingId !== visit.id && (
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCompletingId(visit.id);
                        setRating(5);
                        setFeedback('');
                      }}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold min-h-[36px] touch-manipulation"
                    >
                      Completed
                    </button>
                    <button
                      type="button"
                      onClick={() => update(visit, 'NO_SHOW')}
                      className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold min-h-[36px] touch-manipulation flex items-center justify-center gap-1"
                    >
                      <UserX className="w-3 h-3" />
                      No show
                    </button>
                    <button
                      type="button"
                      onClick={() => update(visit, 'CANCELLED')}
                      className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-500 text-[11px] font-semibold min-h-[36px] touch-manipulation"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {completingId === visit.id && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setRating(value)}
                          aria-label={`${value} star${value > 1 ? 's' : ''}`}
                          className="w-9 h-9 flex items-center justify-center touch-manipulation"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              value <= rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={feedback}
                      onChange={(event) => setFeedback(event.target.value)}
                      rows={2}
                      placeholder="What did the buyer say?"
                      aria-label="Visit feedback"
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => update(visit, 'COMPLETED', { rating, feedback })}
                        disabled={saving}
                        className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold min-h-[36px] disabled:opacity-50 flex items-center justify-center gap-1 touch-manipulation"
                      >
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Save outcome
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompletingId(null)}
                        className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold min-h-[36px] touch-manipulation"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(event) => setScheduledAt(event.target.value)}
          aria-label="Visit date and time"
          className="flex-1 min-w-0 px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none"
        />
        <button
          type="button"
          onClick={schedule}
          disabled={saving || !scheduledAt}
          className="px-3 rounded-xl bg-slate-900 text-white text-[11px] font-semibold min-h-[40px] disabled:opacity-50 touch-manipulation"
        >
          Schedule visit
        </button>
      </div>

      {onOffer &&
        visits.some((visit) => visit.status === 'COMPLETED') &&
        !['OFFER', 'DEPOSIT', 'CLOSED'].includes(stage || '') && (
          <button
            type="button"
            onClick={onOffer}
            className="w-full py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold min-h-[40px] touch-manipulation"
          >
            Visit done — move this lead to Offer
          </button>
        )}

      {error && (
        <p className="text-[11px] font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-2">
          {error}
        </p>
      )}
    </section>
  );
}
