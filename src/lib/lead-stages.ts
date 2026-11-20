/**
 * Lead pipeline vocabulary, safe to import from client components.
 * Server-only serialisation lives in `leads.ts`.
 */

export const LEAD_STAGES = [
  { value: 'INQUIRY', label: 'Inquiry', short: 'Inquiry' },
  { value: 'CONTACTED', label: 'Contacted', short: 'Contacted' },
  { value: 'SITE_VISIT', label: 'Site Visit', short: 'Visit' },
  { value: 'OFFER', label: 'Offer', short: 'Offer' },
  { value: 'DEPOSIT', label: 'Deposit', short: 'Deposit' },
  { value: 'CLOSED', label: 'Closed', short: 'Closed' },
  { value: 'LOST', label: 'Lost', short: 'Lost' },
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number]['value'];

export const OPEN_STAGES: LeadStage[] = [
  'INQUIRY',
  'CONTACTED',
  'SITE_VISIT',
  'OFFER',
  'DEPOSIT',
];

export const LEAD_SOURCES = [
  'INQUIRY',
  'WHATSAPP',
  'REFERRAL',
  'WALK_IN',
  'SIGN',
  'SOCIAL',
  'REPEAT',
  'FIELD',
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const SOURCE_LABELS: Record<string, string> = {
  INQUIRY: 'Shared link',
  WHATSAPP: 'WhatsApp',
  REFERRAL: 'Referral',
  WALK_IN: 'Walk-in',
  SIGN: 'Sign / board',
  SOCIAL: 'Social media',
  REPEAT: 'Repeat buyer',
  FIELD: 'Field',
};

export function isLeadStage(value: string): value is LeadStage {
  return LEAD_STAGES.some((stage) => stage.value === value);
}

export function stageLabel(value: string): string {
  return LEAD_STAGES.find((stage) => stage.value === value)?.label ?? value;
}

export function stageOrder(value: string): number {
  const index = LEAD_STAGES.findIndex((stage) => stage.value === value);
  return index === -1 ? LEAD_STAGES.length : index;
}

export const STAGE_STYLES: Record<
  LeadStage,
  { dot: string; chip: string; column: string; bar: string }
> = {
  INQUIRY: {
    dot: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
    column: 'border-sky-200',
    bar: 'bg-sky-500',
  },
  CONTACTED: {
    dot: 'bg-indigo-500',
    chip: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    column: 'border-indigo-200',
    bar: 'bg-indigo-500',
  },
  SITE_VISIT: {
    dot: 'bg-violet-500',
    chip: 'bg-violet-50 text-violet-700 border-violet-200',
    column: 'border-violet-200',
    bar: 'bg-violet-500',
  },
  OFFER: {
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    column: 'border-amber-200',
    bar: 'bg-amber-500',
  },
  DEPOSIT: {
    dot: 'bg-orange-500',
    chip: 'bg-orange-50 text-orange-700 border-orange-200',
    column: 'border-orange-200',
    bar: 'bg-orange-500',
  },
  CLOSED: {
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    column: 'border-emerald-200',
    bar: 'bg-emerald-500',
  },
  LOST: {
    dot: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-600 border-slate-200',
    column: 'border-slate-200',
    bar: 'bg-slate-400',
  },
};
