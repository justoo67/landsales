'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Star,
  UserX,
  X,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { formatPhone } from '@/lib/phone';
import { toDateTimeInput } from '@/lib/format';
import {
  VISIT_STATUS_LABELS,
  VISIT_STATUS_STYLES,
  type VisitItem,
  type VisitStatus,
} from '@/lib/visits';

function todayISO(): string {
  return toDateTimeInput(new Date()).slice(0, 10);
}

function shiftDay(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toDateTimeInput(date).slice(0, 10);
}

export default function VisitsClient() {
  const [date, setDate] = useState(todayISO);
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<VisitItem | null>(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = `${date}T00:00:00`;
      const to = `${shiftDay(date, 1)}T00:00:00`;
      const res = await fetch(
        `/api/visits?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
      if (res.ok) {
        const data = await res.json();
        setVisits(data.visits || []);
      }
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const dayLabel = useMemo(() => {
    const value = new Date(`${date}T12:00:00`);
    const today = todayISO();
    const tomorrow = shiftDay(today, 1);
    if (date === today) return 'Today';
    if (date === tomorrow) return 'Tomorrow';
    return value.toLocaleDateString('en-KE', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  }, [date]);

  const updateStatus = async (
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
      setCompleting(null);
      setFeedback('');
      setRating(5);
      await load();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Site visits
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{dayLabel}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDate(shiftDay(date, -1))}
            aria-label="Previous day"
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 touch-manipulation"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDate(todayISO())}
            className="px-3 h-10 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 touch-manipulation"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setDate(shiftDay(date, 1))}
            aria-label="Next day"
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 touch-manipulation"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-3 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <div className="py-24 flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-xs">Loading visits…</span>
        </div>
      ) : visits.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No visits this day</h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Schedule one from a lead. The visit also creates a reminder on your Today list.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visits.map((visit) => {
            const style =
              VISIT_STATUS_STYLES[visit.status as VisitStatus] ?? VISIT_STATUS_STYLES.SCHEDULED;
            const time = new Date(visit.scheduledAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={visit.id}
                className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      {time}
                    </div>
                    <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                      {visit.lead?.contact.name || 'Buyer'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {visit.lead ? formatPhone(visit.lead.contact.phone) : ''}
                    </p>
                    {visit.plot && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 min-w-0">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{visit.plot.title}</span>
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-1 rounded-md border flex-shrink-0 ${style}`}
                  >
                    {VISIT_STATUS_LABELS[visit.status as VisitStatus] || visit.status}
                  </span>
                </div>

                {visit.feedback && (
                  <p className="mt-2 text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2 leading-relaxed">
                    {visit.feedback}
                    {visit.rating ? ` · ${visit.rating}/5` : ''}
                  </p>
                )}

                {visit.status === 'SCHEDULED' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCompleting(visit);
                        setRating(5);
                        setFeedback('');
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl min-h-[42px] touch-manipulation"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Completed
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(visit, 'NO_SHOW')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl min-h-[42px] touch-manipulation"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      No show
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {completing && (
        <div className="fixed inset-0 z-[1200] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl pb-safe">
            <div className="flex items-center justify-between px-5 pt-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">How did the visit go?</h2>
                <p className="text-[11px] text-slate-500">
                  {completing.lead?.contact.name} · {completing.plot?.title || 'Plot'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCompleting(null)}
                aria-label="Close"
                className="w-10 h-10 -mr-2 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pb-5 pt-4 space-y-3">
              <div className="flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    aria-label={`${value} star${value > 1 ? 's' : ''}`}
                    className="w-11 h-11 flex items-center justify-center touch-manipulation"
                  >
                    <Star
                      className={`w-7 h-7 ${
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
                rows={3}
                placeholder="Liked the access road, wants to compare with the Kangundo plot…"
                aria-label="Visit feedback"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />

              <button
                type="button"
                onClick={() =>
                  updateStatus(completing, 'COMPLETED', { rating, feedback })
                }
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-2xl min-h-[48px] disabled:opacity-50 touch-manipulation"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save visit outcome'}
              </button>

              <p className="text-[11px] text-slate-400 text-center">
                A completed visit is a good moment to move the lead to Offer.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
