'use client';

import { useState } from 'react';
import { Loader2, MessageCircle, X } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface InquireCtaProps {
  plotId: string;
  plotTitle: string;
  whatsappUrl: string;
}

/**
 * Primary buyer action on the public listing.
 *
 * Tapping WhatsApp first offers an optional name + phone so the agent gets a
 * real lead instead of an anonymous chat. Buyers can skip straight through —
 * the redirect is never blocked by the capture request.
 */
export default function InquireCta({ plotId, plotTitle, whatsappUrl }: InquireCtaProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);

  const openWhatsApp = () => {
    window.location.href = whatsappUrl;
  };

  const capture = async (payload: Record<string, unknown>) => {
    try {
      await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plotId, ...payload }),
        keepalive: true,
      });
    } catch {
      // Never block the buyer's WhatsApp redirect.
    }
  };

  const sendAndOpen = async () => {
    setSending(true);
    triggerHaptic('light');
    await capture({ name: name.trim(), phone: phone.trim() });
    openWhatsApp();
  };

  const skipAndOpen = () => {
    const blob = new Blob([JSON.stringify({ plotId })], { type: 'application/json' });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/inquiries', blob);
    } else {
      capture({});
    }
    openWhatsApp();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          triggerHaptic('light');
          setOpen(true);
        }}
        className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold text-base rounded-2xl shadow-md shadow-emerald-600/30 transition-all min-h-[48px] touch-manipulation"
      >
        <MessageCircle className="w-5 h-5 fill-current" />
        <span>Chat on WhatsApp</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[1200] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl pb-safe">
            <div className="flex items-start justify-between px-5 pt-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Chat with the agent
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{plotTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="w-10 h-10 -mr-2 -mt-1 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pb-5 pt-4 space-y-3">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Add your name so the agent can save your details and send you similar plots.
                It takes a second — or skip straight to WhatsApp.
              </p>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder="Your name"
                aria-label="Your name"
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
              />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="Phone number (0712 345 678)"
                aria-label="Phone number"
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
              />

              <button
                type="button"
                onClick={sendAndOpen}
                disabled={sending || !name.trim() || !phone.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-2xl transition-all min-h-[48px] touch-manipulation disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                Continue to WhatsApp
              </button>

              <button
                type="button"
                onClick={skipAndOpen}
                className="w-full py-2.5 text-slate-500 hover:text-slate-700 text-xs font-semibold touch-manipulation"
              >
                Skip and open WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
