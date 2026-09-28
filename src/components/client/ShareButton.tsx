'use client';

import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface ShareButtonProps {
  title: string;
  priceText: string;
  url?: string;
  variant?: 'header' | 'floating' | 'outline';
  className?: string;
}

export default function ShareButton({
  title,
  priceText,
  url,
  variant = 'header',
  className = '',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Subtle iOS tactile haptics
    triggerHaptic('light');

    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    const shareData = {
      title: `${title} — ${priceText}`,
      text: `Take a look at this land listing: ${title} (${priceText})`,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: unknown) {
        // User aborted share sheet or unsupported platform error; fall back to clipboard copy
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
      }
    }

    // Fallback: Clipboard copy
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      } catch (copyErr) {
        console.error('Failed to copy to clipboard:', copyErr);
      }
    }
  };

  if (variant === 'floating') {
    return (
      <button
        type="button"
        onClick={handleShare}
        aria-label={copied ? 'Listing link copied' : 'Share property listing'}
        className={`relative w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all min-h-[44px] min-w-[44px] touch-manipulation flex-shrink-0 ${className}`}
        title="Share Listing"
      >
        {copied ? (
          <Check className="w-5 h-5 text-emerald-600 animate-in zoom-in-75 duration-150" />
        ) : (
          <Share2 className="w-5 h-5" />
        )}
        {copied && (
          <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-150">
            Copied!
          </span>
        )}
      </button>
    );
  }

  // Header or default variant
  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={copied ? 'Listing link copied' : 'Share property listing'}
      className={`relative inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all min-h-[36px] touch-manipulation ${className}`}
      title="Share Listing"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-75 duration-150" />
          <span className="text-emerald-700">Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </>
      )}
    </button>
  );
}
