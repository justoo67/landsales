/** Site-visit vocabulary, safe to import from client components. */

export const VISIT_STATUSES = [
  'SCHEDULED',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED',
] as const;

export type VisitStatus = (typeof VISIT_STATUSES)[number];

export function isVisitStatus(value: string): value is VisitStatus {
  return VISIT_STATUSES.some((status) => status === value);
}

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  NO_SHOW: 'No show',
  CANCELLED: 'Cancelled',
};

export const VISIT_STATUS_STYLES: Record<VisitStatus, string> = {
  SCHEDULED: 'bg-sky-50 text-sky-700 border-sky-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  NO_SHOW: 'bg-amber-50 text-amber-700 border-amber-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
};

export interface VisitItem {
  id: string;
  scheduledAt: string;
  status: string;
  feedback: string | null;
  rating: number | null;
  plotId: string | null;
  leadId: string;
  lead?: {
    id: string;
    stage: string;
    contact: { id: string; name: string; phone: string };
  } | null;
  plot?: { id: string; title: string } | null;
}
