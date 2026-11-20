'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Receipt,
  StickyNote,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { formatKes } from '@/lib/money';
import { formatPhone, whatsappNumber } from '@/lib/phone';
import { initials, timeAgo } from '@/lib/format';
import { triggerHaptic } from '@/lib/haptics';
import {
  LEAD_STAGES,
  SOURCE_LABELS,
  STAGE_STYLES,
  type LeadStage,
} from '@/lib/lead-stages';
import type { LeadActivity, LeadRecord } from '@/lib/lead-types';

interface LeadDetailSheetProps {
  leadId: string;
  onClose: () => void;
  onChanged: () => void;
}

function ActivityIcon({ type }: { type: string }) {
  const common = 'w-3.5 h-3.5';
  switch (type) {
    case 'CALL':
      return <Phone className={`${common} text-sky-600`} />;
    case 'WHATSAPP':
      return <MessageCircle className={`${common} text-emerald-600`} />;
    case 'STAGE_CHANGED':
      return <ArrowRight className={`${common} text-indigo-600`} />;
    case 'INQUIRY':
      return <User className={`${common} text-sky-600`} />;
    case 'LEAD_CREATED':
      return <User className={`${common} text-slate-500`} />;
    case 'PAYMENT':
      return <Receipt className={`${common} text-orange-600`} />;
    default:
      return <StickyNote className={`${common} text-slate-500`} />;
  }
}

export default function LeadDetailSheet({
  leadId,
  onClose,
  onChanged,
}: LeadDetailSheetProps) {
  const [lead, setLead] = useState<LeadRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageBusy, setStageBusy] = useState<string | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);
  const [lostPrompt, setLostPrompt] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [note, setNote] = useState('');
  const [posting, setPosting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    altPhone: '',
    email: '',
  });
  const [savingContact, setSavingContact] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const data = await res.json();
      if (res.ok) {
        setLead(data.lead);
        setContactForm({
          name: data.lead.contact.name || '',
          phone: data.lead.contact.phone || '',
          altPhone: data.lead.contact.altPhone || '',
          email: data.lead.contact.email || '',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStage = async (stage: LeadStage, reason?: string) => {
    setStageBusy(stage);
    setStageError(null);

    try {
      const res = await fetch(`/api/leads/${leadId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, lostReason: reason }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStageError(data.error || 'Could not change stage');
        if (data.code === 'LOST_REASON_REQUIRED') setLostPrompt(true);
        triggerHaptic('warning');
        return;
      }

      triggerHaptic('success');
      setLostPrompt(false);
      setLostReason('');
      await load();
      onChanged();
    } catch {
      setStageError('Network error');
    } finally {
      setStageBusy(null);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: note.trim(), type: 'NOTE' }),
      });
      const data = await res.json();
      if (res.ok && data.activity) {
        setNote('');
        setLead((prev) =>
          prev
            ? { ...prev, activities: [data.activity, ...(prev.activities || [])] }
            : prev
        );
        triggerHaptic('light');
      }
    } finally {
      setPosting(false);
    }
  };

  const saveContact = async () => {
    setSavingContact(true);
    try {
      const res = await fetch(`/api/contacts/${lead?.contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json();
      if (res.ok) {
        setLead((prev) => (prev ? { ...prev, contact: data.contact } : prev));
        setEditing(false);
        triggerHaptic('success');
        onChanged();
      } else {
        setStageError(data.error || 'Could not update buyer');
      }
    } finally {
      setSavingContact(false);
    }
  };

  const removeLead = async () => {
    const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
    if (res.ok) {
      triggerHaptic('warning');
      onChanged();
      onClose();
    }
  };

  const waHref = useMemo(() => {
    if (!lead) return '#';
    const firstName = lead.contact.name.split(' ')[0];
    const message = `Hi ${firstName}, this is your land agent. Following up on ${
      lead.plot?.title || 'the plots we discussed'
    }.`;
    return `https://wa.me/${whatsappNumber(lead.contact.phone)}?text=${encodeURIComponent(
      message
    )}`;
  }, [lead]);

  return (
    <div className="fixed inset-0 z-[1100] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[94dvh] flex flex-col">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-slate-100 px-5 py-3.5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-teal-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
              {lead ? initials(lead.contact.name) : '…'}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">
                {loading ? 'Loading…' : lead?.contact.name}
              </h2>
              <p className="text-[11px] text-slate-500">
                {lead ? formatPhone(lead.contact.phone) : ''}
                {lead ? ` · ${SOURCE_LABELS[lead.source] || lead.source}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 touch-manipulation flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-28">
          {loading || !lead ? (
            <div className="py-16 flex items-center justify-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <>
              {/* Quick contact actions */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-2xl min-h-[46px] touch-manipulation"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
                <a
                  href={`tel:${lead.contact.phone}`}
                  className="flex items-center justify-center gap-2 px-3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-2xl min-h-[46px] touch-manipulation"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              </div>

              {/* Stage pipeline */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Pipeline stage
                  </h3>
                  {stageBusy && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {LEAD_STAGES.map((stage) => {
                    const active = lead.stage === stage.value;
                    const style = STAGE_STYLES[stage.value];
                    return (
                      <button
                        key={stage.value}
                        type="button"
                        disabled={Boolean(stageBusy) || active}
                        onClick={() => {
                          if (stage.value === 'LOST') {
                            setLostPrompt(true);
                            return;
                          }
                          changeStage(stage.value);
                        }}
                        className={`flex-shrink-0 px-3 py-2 rounded-xl text-[11px] font-semibold border min-h-[38px] touch-manipulation transition-colors ${
                          active
                            ? `${style.chip} ring-2 ring-offset-1 ring-slate-300`
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {stage.short}
                      </button>
                    );
                  })}
                </div>

                {lead.stage === 'LOST' && lead.lostReason && (
                  <p className="text-[11px] text-slate-500">
                    Lost reason: <span className="text-slate-700">{lead.lostReason}</span>
                  </p>
                )}

                {stageError && (
                  <p className="text-[11px] font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-2">
                    {stageError}
                  </p>
                )}

                {lead.stage === 'DEPOSIT' && !lead.sale && (
                  <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl p-2.5">
                    <Receipt className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-orange-800 leading-relaxed">
                      No sale recorded for this plot yet.{' '}
                      {lead.plot && (
                        <Link
                          href={`/dashboard/plots/${lead.plot.id}/edit`}
                          className="font-semibold underline"
                        >
                          Open the plot
                        </Link>
                      )}{' '}
                      to log the deposit and keep the ledger accurate.
                    </p>
                  </div>
                )}
              </section>

              {/* Lost reason prompt */}
              {lostPrompt && (
                <section className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                  <label htmlFor="lost-reason" className="text-[11px] font-semibold text-slate-600">
                    Why was this lead lost?
                  </label>
                  <input
                    id="lost-reason"
                    value={lostReason}
                    onChange={(event) => setLostReason(event.target.value)}
                    placeholder="e.g. Bought elsewhere, price too high"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => changeStage('LOST', lostReason)}
                      disabled={!lostReason.trim() || Boolean(stageBusy)}
                      className="flex-1 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl min-h-[40px] disabled:opacity-50"
                    >
                      Mark lost
                    </button>
                    <button
                      type="button"
                      onClick={() => setLostPrompt(false)}
                      className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl min-h-[40px]"
                    >
                      Cancel
                    </button>
                  </div>
                </section>
              )}

              {/* Plot of interest */}
              <section className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Plot of interest
                  </h3>
                  {lead.plot && (
                    <Link
                      href={`/p/${lead.plot.id}`}
                      target="_blank"
                      className="text-[11px] font-semibold text-sky-600 flex items-center gap-1"
                    >
                      Client page <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                {lead.plot ? (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {lead.plot.title}
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {lead.plot.sizePreset} · {lead.plot.status.toLowerCase()}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-900 flex-shrink-0">
                      {lead.plot.priceKes ? formatKes(lead.plot.priceKes) : 'On request'}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No plot linked yet.</p>
                )}

                {(lead.budgetMinKes || lead.budgetMaxKes) && (
                  <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200">
                    Budget:{' '}
                    <span className="font-semibold text-slate-700">
                      {lead.budgetMinKes ? formatKes(lead.budgetMinKes) : '—'} –{' '}
                      {lead.budgetMaxKes ? formatKes(lead.budgetMaxKes) : '—'}
                    </span>
                  </p>
                )}
              </section>

              {/* Buyer details */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Buyer details
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditing((value) => !value)}
                    className="text-[11px] font-semibold text-sky-600"
                  >
                    {editing ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                {editing ? (
                  <div className="space-y-2">
                    {(
                      [
                        ['name', 'Name', 'text'],
                        ['phone', 'Phone', 'tel'],
                        ['altPhone', 'Alternative phone', 'tel'],
                        ['email', 'Email', 'email'],
                      ] as const
                    ).map(([field, label, type]) => (
                      <input
                        key={field}
                        value={contactForm[field]}
                        onChange={(event) =>
                          setContactForm((prev) => ({ ...prev, [field]: event.target.value }))
                        }
                        type={type}
                        inputMode={type === 'tel' ? 'tel' : undefined}
                        placeholder={label}
                        aria-label={label}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      />
                    ))}
                    <button
                      type="button"
                      onClick={saveContact}
                      disabled={savingContact}
                      className="w-full py-2.5 bg-sky-600 text-white text-xs font-semibold rounded-xl min-h-[40px] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {savingContact ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save buyer details
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>{lead.contact.name}</p>
                    <p>{formatPhone(lead.contact.phone)}</p>
                    {lead.contact.altPhone && <p>{formatPhone(lead.contact.altPhone)}</p>}
                    {lead.contact.email && <p>{lead.contact.email}</p>}
                    {lead.contact.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {lead.contact.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Activity timeline */}
              <section className="space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Activity
                </h3>

                <div className="flex gap-2">
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') addNote();
                    }}
                    placeholder="Add a note (call summary, next step…)"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                  <button
                    type="button"
                    onClick={addNote}
                    disabled={!note.trim() || posting}
                    className="px-4 rounded-xl bg-slate-900 text-white text-xs font-semibold min-h-[44px] disabled:opacity-40 flex items-center justify-center"
                  >
                    {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                  </button>
                </div>

                <ol className="space-y-2 pt-1">
                  {(lead.activities || []).map((activity: LeadActivity) => (
                    <li
                      key={activity.id}
                      className="flex gap-2.5 bg-slate-50/80 border border-slate-100 rounded-xl px-3 py-2.5"
                    >
                      <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <ActivityIcon type={activity.type} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-700 leading-relaxed break-words">
                          {activity.body}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {timeAgo(activity.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                  {(lead.activities || []).length === 0 && (
                    <li className="text-xs text-slate-400 text-center py-4">
                      No activity yet.
                    </li>
                  )}
                </ol>
              </section>

              <section className="pt-2 border-t border-slate-100">
                {confirmDelete ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600">
                      Remove this lead and its timeline? The buyer stays in your contacts.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={removeLead}
                        className="flex-1 py-2.5 bg-rose-600 text-white text-xs font-semibold rounded-xl min-h-[42px]"
                      >
                        Yes, remove lead
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl min-h-[42px]"
                      >
                        Keep it
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors py-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove lead
                  </button>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
