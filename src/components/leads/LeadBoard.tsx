'use client';

import { useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import LeadCard from './LeadCard';
import { LEAD_STAGES, STAGE_STYLES, type LeadStage } from '@/lib/lead-stages';
import type { LeadRecord } from '@/lib/lead-types';

interface LeadBoardProps {
  leads: LeadRecord[];
  onSelect: (id: string) => void;
  onStageChange: (id: string, stage: LeadStage) => void;
  onNewLead: () => void;
}

export default function LeadBoard({
  leads,
  onSelect,
  onStageChange,
  onNewLead,
}: LeadBoardProps) {
  const [mobileStage, setMobileStage] = useState<LeadStage | 'ALL'>('ALL');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  const byStage = useMemo(() => {
    const groups = new Map<LeadStage, LeadRecord[]>();
    for (const stage of LEAD_STAGES) groups.set(stage.value, []);
    for (const lead of leads) {
      const group = groups.get(lead.stage as LeadStage);
      if (group) group.push(lead);
    }
    return groups;
  }, [leads]);

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [stage, group] of byStage) result[stage] = group.length;
    return result;
  }, [byStage]);

  const mobileLeads =
    mobileStage === 'ALL'
      ? leads
      : leads.filter((lead) => lead.stage === mobileStage);

  const handleDrop = (stage: LeadStage) => {
    if (draggingId) onStageChange(draggingId, stage);
    setDraggingId(null);
    setDragOverStage(null);
  };

  if (leads.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
          <Users className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">No leads yet</h3>
        <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
          Every buyer who taps “Chat on WhatsApp” on a shared listing lands here
          automatically. You can also add one after a phone call or a walk-in.
        </p>
        <button
          type="button"
          onClick={onNewLead}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all touch-manipulation active:scale-95 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Add your first lead
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile: stage chips + list. Dragging is desktop-only by design. */}
      <div className="sm:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
          <button
            type="button"
            onClick={() => setMobileStage('ALL')}
            className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors min-h-[40px] ${
              mobileStage === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            All · {leads.length}
          </button>
          {LEAD_STAGES.map((stage) => (
            <button
              key={stage.value}
              type="button"
              onClick={() => setMobileStage(stage.value)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors min-h-[40px] ${
                mobileStage === stage.value
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${STAGE_STYLES[stage.value].dot}`}
              />
              {stage.short} · {counts[stage.value] ?? 0}
            </button>
          ))}
        </div>

        <div className="space-y-2.5 mt-3">
          {mobileLeads.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-8">
              Nothing in this stage.
            </p>
          ) : (
            mobileLeads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onSelect={onSelect} showStage />
            ))
          )}
        </div>
      </div>

      {/* Desktop: pipeline board */}
      <div className="hidden sm:block overflow-x-auto pb-4 -mx-2 px-2">
        <div className="flex gap-3 min-w-max items-start">
          {LEAD_STAGES.map((stage) => {
            const group = byStage.get(stage.value) ?? [];
            const isTarget = dragOverStage === stage.value;

            return (
              <div
                key={stage.value}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverStage(stage.value);
                }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={() => handleDrop(stage.value)}
                className={`w-[268px] flex-shrink-0 rounded-2xl border bg-slate-100/60 transition-colors ${
                  isTarget ? 'border-sky-400 bg-sky-50' : STAGE_STYLES[stage.value].column
                }`}
              >
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200/70">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${STAGE_STYLES[stage.value].dot}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      {stage.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {group.length}
                  </span>
                </div>

                <div className="p-2 space-y-2 min-h-[120px] max-h-[calc(100dvh-16rem)] overflow-y-auto">
                  {group.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-6 px-2">
                      Drop a lead here
                    </p>
                  ) : (
                    group.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onSelect={onSelect}
                        onDragStart={setDraggingId}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
