'use client';

import { MapPin, Receipt } from 'lucide-react';
import { formatKes } from '@/lib/money';
import { initials, timeAgo } from '@/lib/format';
import { SOURCE_LABELS, STAGE_STYLES, type LeadStage } from '@/lib/lead-stages';
import type { LeadRecord } from '@/lib/lead-types';

interface LeadCardProps {
  lead: LeadRecord;
  onSelect: (id: string) => void;
  onDragStart?: (id: string) => void;
  showStage?: boolean;
}

export default function LeadCard({
  lead,
  onSelect,
  onDragStart,
  showStage = false,
}: LeadCardProps) {
  const style = STAGE_STYLES[lead.stage as LeadStage] ?? STAGE_STYLES.INQUIRY;
  const needsLedger = lead.stage === 'DEPOSIT' && !lead.sale;

  return (
    <button
      type="button"
      draggable={Boolean(onDragStart)}
      onDragStart={() => onDragStart?.(lead.id)}
      onClick={() => onSelect(lead.id)}
      className="w-full text-left bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all touch-manipulation active:scale-[0.99] cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-600 to-teal-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {initials(lead.contact.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-sm text-slate-900 truncate">
              {lead.contact.name}
            </span>
            {showStage && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${style.chip} flex-shrink-0`}
              >
                {lead.stage.toLowerCase()}
              </span>
            )}
          </div>

          {lead.plot ? (
            <span className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 min-w-0">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{lead.plot.title}</span>
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              No plot linked yet
            </span>
          )}

          <div className="flex items-center justify-between gap-2 mt-1.5">
            <span className="text-xs font-semibold text-slate-700">
              {lead.budgetMaxKes
                ? formatKes(lead.budgetMaxKes)
                : lead.plot?.priceKes
                ? formatKes(lead.plot.priceKes)
                : '—'}
            </span>
            <span className="text-[10px] text-slate-400">
              {SOURCE_LABELS[lead.source] || lead.source} · {timeAgo(lead.updatedAt)}
            </span>
          </div>

          {needsLedger && (
            <span className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-1.5 py-1">
              <Receipt className="w-3 h-3" />
              Deposit stage but no sale recorded
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
