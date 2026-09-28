'use client';

import { useState } from 'react';
import { X, Check, DollarSign, User, Phone, Calendar, CreditCard, Shield } from 'lucide-react';

interface SaleRecordDrawerProps {
  plotId: string;
  plotTitle: string;
  defaultPrice: number | null;
  targetStatus: 'PENDING' | 'SOLD';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedStatus: string) => void;
}

export default function SaleRecordDrawer({
  plotId,
  plotTitle,
  defaultPrice,
  targetStatus,
  isOpen,
  onClose,
  onSuccess,
}: SaleRecordDrawerProps) {
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('+254');
  const [buyerNationalId, setBuyerNationalId] = useState('');
  const [agreedPrice, setAgreedPrice] = useState<string>(
    defaultPrice ? String(defaultPrice) : ''
  );
  const [paymentType, setPaymentType] = useState<'LUMP_SUM' | 'INSTALLMENT'>('INSTALLMENT');
  const [deposit, setDeposit] = useState<string>(
    defaultPrice ? String(Math.round(defaultPrice * 0.3)) : '' // Default to 30% deposit in Kenya
  );
  const [nextDueDate, setNextDueDate] = useState<string>(() => {
    // Default next due date to 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const numericPrice = parseFloat(agreedPrice) || 0;
  const numericDeposit = paymentType === 'LUMP_SUM' ? numericPrice : parseFloat(deposit) || 0;
  const balance = Math.max(0, numericPrice - numericDeposit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim()) {
      setError('Please provide the buyer name');
      return;
    }
    if (!buyerPhone.trim() || buyerPhone.length < 9) {
      setError('Please provide a valid WhatsApp phone number');
      return;
    }
    if (numericPrice <= 0) {
      setError('Please enter a valid agreed price');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/plots/${plotId}/deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerName: buyerName.trim(),
          buyerPhone: buyerPhone.trim(),
          buyerNationalId: buyerNationalId.trim() || null,
          agreedPriceKes: numericPrice,
          paymentType,
          depositKes: numericDeposit,
          nextDueDate: paymentType === 'INSTALLMENT' && nextDueDate ? nextDueDate : null,
          notes: notes.trim() || null,
          plotStatus: targetStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record deal');
      }

      onSuccess(targetStatus);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error saving deal record');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90dvh] pb-safe animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  targetStatus === 'SOLD' ? 'bg-rose-500' : 'bg-orange-500'
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {targetStatus === 'SOLD' ? 'Mark as Sold' : 'Record Deal / Reserve'}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 truncate max-w-[260px] sm:max-w-sm mt-0.5">
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-sm">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Buyer Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Buyer Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="e.g., Samuel Kamau"
                    className="w-full px-3 py-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-900 min-h-[44px]"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp Phone *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="+254712345678"
                    className="w-full px-3 py-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-900 min-h-[44px]"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  National ID / KRA PIN (Optional for legal transfer)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={buyerNationalId}
                    onChange={(e) => setBuyerNationalId(e.target.value)}
                    placeholder="e.g., ID 28491042 / A001928392X"
                    className="w-full px-3 py-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-900 min-h-[44px]"
                  />
                  <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Terms */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Price & Payment Terms
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Agreed Closing Price (KSh) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  required
                  value={agreedPrice}
                  onChange={(e) => setAgreedPrice(e.target.value)}
                  placeholder="1,500,000"
                  className="w-full px-3.5 py-2.5 pl-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-900 font-bold text-base min-h-[44px]"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  KSh
                </span>
              </div>
            </div>

            {/* Payment Type Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Structure
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaymentType('INSTALLMENT')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all touch-manipulation min-h-[40px] flex items-center justify-center gap-1.5 ${
                    paymentType === 'INSTALLMENT'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Installments</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType('LUMP_SUM')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all touch-manipulation min-h-[40px] flex items-center justify-center gap-1.5 ${
                    paymentType === 'LUMP_SUM'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>100% Cash / Lump Sum</span>
                </button>
              </div>
            </div>

            {/* Installment breakdown */}
            {paymentType === 'INSTALLMENT' && (
              <div className="p-3.5 bg-sky-50/70 border border-sky-100 rounded-2xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Deposit Received (KSh)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={deposit}
                      onChange={(e) => setDeposit(e.target.value)}
                      placeholder="400,000"
                      className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl focus:outline-none text-slate-900 font-semibold min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Next Payment Due Date
                    </label>
                    <input
                      type="date"
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl focus:outline-none text-slate-900 text-xs min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-sky-100 font-medium">
                  <span className="text-slate-600">Calculated Remaining Balance:</span>
                  <span className="text-sky-800 font-bold text-sm">
                    KSh {balance.toLocaleString('en-KE')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium min-h-[44px] touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-semibold rounded-xl shadow-md transition-all min-h-[44px] touch-manipulation disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Saving Record...' : 'Confirm & Save Deal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
