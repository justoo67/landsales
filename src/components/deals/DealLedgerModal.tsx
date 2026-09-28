'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  Plus,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Star,
  Share2,
  Calendar,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface Installment {
  id: string;
  amountKes: number;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
}

interface Review {
  id: string;
  buyerName: string;
  rating: number;
  comment: string;
  isPublished: boolean;
}

interface DealData {
  id: string;
  plotId: string;
  buyerName: string;
  buyerPhone: string;
  buyerNationalId: string | null;
  buyerCustomFields: string | null;
  agreedPriceKes: number;
  paymentType: string;
  depositKes: number;
  balanceKes: number;
  nextDueDate: string | null;
  titleStatus: string;
  notes: string | null;
  closedAt: string;
  installments: Installment[];
  review: Review | null;
}

interface DealLedgerModalProps {
  plotId: string;
  plotTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onDealUpdated?: () => void;
}

const MILESTONES = [
  { key: 'DEPOSIT_PAID', label: 'Deposit Paid' },
  { key: 'AGREEMENT_SIGNED', label: 'Sale Agreement' },
  { key: 'BALANCE_CLEARED', label: 'Balance Cleared' },
  { key: 'LCB_CONSENT', label: 'LCB Consent' },
  { key: 'TITLE_ISSUED', label: 'Title Deed Issued' },
];

export default function DealLedgerModal({
  plotId,
  plotTitle,
  isOpen,
  onClose,
  onDealUpdated,
}: DealLedgerModalProps) {
  const [deal, setDeal] = useState<DealData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PAYMENTS' | 'MILESTONES' | 'REVIEW'>('PAYMENTS');

  // Log Payment Form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [loggingPayment, setLoggingPayment] = useState(false);

  // Review Form state
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [savingReview, setSavingReview] = useState(false);
  const [reviewSaved, setReviewSaved] = useState(false);

  const fetchDeal = async () => {
    try {
      const res = await fetch(`/api/plots/${plotId}/deal`);
      if (res.ok) {
        const data = await res.json();
        setDeal(data.deal);
        if (data.deal?.review?.comment) {
          setReviewComment(data.deal.review.comment);
          setReviewRating(data.deal.review.rating || 5);
        }
      }
    } catch (err) {
      console.error('Fetch deal error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDeal();
    }
  }, [isOpen, plotId]);

  if (!isOpen) return null;

  const totalPaid = deal
    ? deal.installments.reduce((sum, item) => sum + item.amountKes, 0)
    : 0;
  const progressPercent = deal
    ? Math.min(100, Math.round((totalPaid / deal.agreedPriceKes) * 100))
    : 0;

  const cleanPhone = deal?.buyerPhone?.replace(/[^0-9]/g, '') || '';

  // Generate 1-Tap WhatsApp Payment Statement
  const generateWhatsAppStatement = () => {
    if (!deal) return '';
    const lastInstallment = deal.installments[0];
    const lastPaidText = lastInstallment
      ? `Payment of KSh ${lastInstallment.amountKes.toLocaleString('en-KE')} received.`
      : '';
    const nextDueText = deal.nextDueDate
      ? `\nNext Due Date: ${new Date(deal.nextDueDate).toLocaleDateString('en-KE', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`
      : '';

    const text = `Hi ${deal.buyerName}, payment update for ${plotTitle}:
${lastPaidText}
Total Cleared: KSh ${totalPaid.toLocaleString('en-KE')}
Remaining Balance: KSh ${deal.balanceKes.toLocaleString('en-KE')}${nextDueText}

Thank you for your commitment!`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || parseFloat(payAmount) <= 0) return;

    setLoggingPayment(true);
    try {
      const res = await fetch(`/api/plots/${plotId}/deal/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountKes: parseFloat(payAmount),
          reference: payRef.trim() || null,
          notes: payNotes.trim() || null,
        }),
      });

      if (res.ok) {
        setPayAmount('');
        setPayRef('');
        setPayNotes('');
        setShowPaymentForm(false);
        await fetchDeal();
        onDealUpdated?.();
      }
    } catch (err) {
      console.error('Log payment error:', err);
    } finally {
      setLoggingPayment(false);
    }
  };

  const handleUpdateMilestone = async (newStage: string) => {
    try {
      const res = await fetch(`/api/plots/${plotId}/deal/milestone`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titleStatus: newStage }),
      });
      if (res.ok) {
        setDeal((prev) => (prev ? { ...prev, titleStatus: newStage } : prev));
        onDealUpdated?.();
      }
    } catch (err) {
      console.error('Update milestone error:', err);
    }
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    setSavingReview(true);
    try {
      const res = await fetch(`/api/plots/${plotId}/deal/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerName: deal?.buyerName,
          rating: reviewRating,
          comment: reviewComment.trim(),
          isPublished: true,
        }),
      });

      if (res.ok) {
        setReviewSaved(true);
        setTimeout(() => setReviewSaved(false), 2500);
        await fetchDeal();
        onDealUpdated?.();
      }
    } catch (err) {
      console.error('Save review error:', err);
    } finally {
      setSavingReview(false);
    }
  };

  // Find index of current milestone stage
  const currentStageIndex = MILESTONES.findIndex((m) => m.key === deal?.titleStatus);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] pb-safe animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 block">
              Deal Ledger & Installments
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate max-w-[280px] sm:max-w-md">
              {plotTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 active:scale-95 transition-all touch-manipulation"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading deal record...</div>
        ) : !deal ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <h4 className="font-semibold text-slate-800">No Sale Record Linked Yet</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              This plot is marked as available or was created without an initial buyer record.
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Buyer Contact & Summary Card */}
            {(() => {
              const customFields = (() => {
                if (deal.buyerCustomFields) {
                  try {
                    const parsed = JSON.parse(deal.buyerCustomFields);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      return parsed as { id?: string; label: string; value: string }[];
                    }
                  } catch {
                    // Ignore JSON parse errors
                  }
                }
                if (deal.buyerNationalId) {
                  return [{ id: 'legacy-id', label: 'National ID / PIN', value: deal.buyerNationalId }];
                }
                return [];
              })();

              return (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                        Buyer Information
                      </span>
                      <h4 className="font-bold text-slate-900 text-base">{deal.buyerName}</h4>
                      <div className="text-xs text-slate-600 mt-0.5 font-medium">
                        {deal.buyerPhone}
                      </div>
                    </div>

                    {/* 1-Tap Call & WhatsApp triggers adhering to 44x44pt target */}
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${deal.buyerPhone}`}
                        className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                        title="Call Buyer"
                      >
                        <Phone className="w-4 h-4" />
                      </a>

                      <a
                        href={`https://wa.me/${cleanPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-11 h-11 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-5 h-5 fill-current" />
                      </a>
                    </div>
                  </div>

                  {/* Dynamic Buyer Custom Identifier Badges */}
                  {customFields.length > 0 && (
                    <div className="pt-2.5 border-t border-slate-200/70 flex flex-wrap gap-1.5">
                      {customFields.map((field, idx) => (
                        <div
                          key={field.id || `${field.label}-${idx}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs"
                        >
                          <span className="font-semibold text-slate-500">{field.label}:</span>
                          <span className="font-medium text-slate-900">{field.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Financial Progress Bar Card */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                    Agreed Sale Price
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    KSh {deal.agreedPriceKes.toLocaleString('en-KE')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                    Remaining Balance
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-sky-700">
                    KSh {deal.balanceKes.toLocaleString('en-KE')}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      deal.balanceKes === 0
                        ? 'bg-emerald-500'
                        : 'bg-gradient-to-r from-sky-500 to-emerald-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mt-1.5">
                  <span>Cleared: KSh {totalPaid.toLocaleString('en-KE')}</span>
                  <span>{progressPercent}% Paid</span>
                </div>
              </div>

              {/* 1-Tap WhatsApp Receipt Generator */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <a
                  href={generateWhatsAppStatement()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-sm transition-all min-h-[44px] touch-manipulation"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>Send WhatsApp Receipt / Balance</span>
                </a>
              </div>
            </div>

            {/* Navigation Tabs (Payments, Title Milestones, Review) */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setActiveTab('PAYMENTS')}
                className={`px-3 py-2 text-xs font-bold rounded-xl transition-all touch-manipulation min-h-[40px] ${
                  activeTab === 'PAYMENTS'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Payments ({deal.installments.length})
              </button>

              <button
                onClick={() => setActiveTab('MILESTONES')}
                className={`px-3 py-2 text-xs font-bold rounded-xl transition-all touch-manipulation min-h-[40px] ${
                  activeTab === 'MILESTONES'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Title Milestones
              </button>

              <button
                onClick={() => setActiveTab('REVIEW')}
                className={`px-3 py-2 text-xs font-bold rounded-xl transition-all touch-manipulation min-h-[40px] ${
                  activeTab === 'REVIEW'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Buyer Review
              </button>
            </div>

            {/* TAB 1: PAYMENTS & INSTALLMENTS */}
            {activeTab === 'PAYMENTS' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Payment History
                  </h4>
                  <button
                    onClick={() => setShowPaymentForm(!showPaymentForm)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200/80 rounded-xl text-xs font-semibold hover:bg-sky-100 active:scale-95 transition-all min-h-[40px] touch-manipulation"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showPaymentForm ? 'Cancel' : 'Log Payment'}</span>
                  </button>
                </div>

                {/* Log Payment Quick Drawer/Form */}
                {showPaymentForm && (
                  <form
                    onSubmit={handleLogPayment}
                    className="p-4 bg-sky-50/60 border border-sky-200 rounded-2xl space-y-3 animate-in fade-in duration-150"
                  >
                    <h5 className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                      Record Installment Received
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Amount (KSh) *
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          required
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="e.g. 100,000"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          M-Pesa / Bank Reference
                        </label>
                        <input
                          type="text"
                          value={payRef}
                          onChange={(e) => setPayRef(e.target.value)}
                          placeholder="e.g. SH910283K"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 min-h-[44px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        placeholder="e.g., 2nd installment for boundary fence"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 min-h-[44px]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loggingPayment}
                      className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all min-h-[44px] touch-manipulation disabled:opacity-50"
                    >
                      {loggingPayment ? 'Logging...' : 'Confirm Payment'}
                    </button>
                  </form>
                )}

                {/* Installments Table / List */}
                <div className="space-y-2">
                  {deal.installments.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No payments logged yet.
                    </div>
                  ) : (
                    deal.installments.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            KSh {item.amountKes.toLocaleString('en-KE')}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>
                              {new Date(item.paymentDate).toLocaleDateString('en-KE', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            {item.reference && (
                              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                {item.reference}
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-[11px] text-slate-600 italic mt-0.5">
                              {item.notes}
                            </p>
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: TITLE CONVEYANCING MILESTONES */}
            {activeTab === 'MILESTONES' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Title Deed & Legal Pipeline
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track the progress of land transfer from initial deposit to title issuance.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {MILESTONES.map((m, idx) => {
                    const isCompleted = idx <= currentStageIndex;
                    const isCurrent = idx === currentStageIndex;

                    return (
                      <button
                        key={m.key}
                        onClick={() => handleUpdateMilestone(m.key)}
                        type="button"
                        className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all touch-manipulation min-h-[50px] ${
                          isCurrent
                            ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-500/20 shadow-sm'
                            : isCompleted
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isCompleted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-semibold text-sm block leading-tight">
                              {m.label}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {isCurrent ? 'Current active stage' : isCompleted ? 'Completed' : 'Pending'}
                            </span>
                          </div>
                        </div>

                        {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: BUYER REVIEW & SOCIAL PROOF */}
            {activeTab === 'REVIEW' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Verified Buyer Review
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Collect testimonials upon title handover to display as social proof on your listing link.
                  </p>
                </div>

                {reviewSaved && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Review saved and published to public listing!</span>
                  </div>
                )}

                <form onSubmit={handleSaveReview} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Rating (1-5 Stars)
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="w-10 h-10 flex items-center justify-center touch-manipulation active:scale-90"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= reviewRating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Buyer Feedback / Testimonial
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="e.g., Delivered the title deed within 60 days. Honest and transparent agent!"
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none text-slate-900 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingReview}
                    className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all min-h-[44px] touch-manipulation disabled:opacity-50"
                  >
                    {savingReview ? 'Saving...' : 'Save & Publish Review Badge'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
