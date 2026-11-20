import type { Lead, Contact, Plot, SaleRecord } from '@prisma/client';
import { serializeMoney } from './money.server';
import { isLeadStage } from './lead-stages';

export * from './lead-stages';

export interface StageTransitionInput {
  to: string;
  lostReason?: string | null;
  hasSaleRecord?: boolean;
}

/**
 * Stage rules enforced on the server.
 *
 * - LOST needs a reason, otherwise the pipeline teaches nothing.
 * - CLOSED needs a sale record: the ledger, not the board, is the source of
 *   truth for money.
 * - DEPOSIT is allowed before a ledger exists (the agent may book verbally);
 *   the UI flags it and Phase 5 tightens this.
 */
export function validateStageTransition({
  to,
  lostReason,
  hasSaleRecord,
}: StageTransitionInput): { ok: true } | { ok: false; error: string; code: string } {
  if (!isLeadStage(to)) {
    return { ok: false, error: 'Unknown pipeline stage', code: 'INVALID_STAGE' };
  }

  if (to === 'LOST' && !lostReason?.trim()) {
    return {
      ok: false,
      error: 'Add a reason before marking this lead as lost',
      code: 'LOST_REASON_REQUIRED',
    };
  }

  if (to === 'CLOSED' && !hasSaleRecord) {
    return {
      ok: false,
      error: 'Record the sale on the plot before closing this lead',
      code: 'SALE_RECORD_REQUIRED',
    };
  }

  return { ok: true };
}

export const ACTIVITY_ICONS: Record<string, string> = {
  INQUIRY: 'inquiry',
  LEAD_CREATED: 'lead',
  STAGE_CHANGED: 'stage',
  NOTE: 'note',
  CALL: 'call',
  WHATSAPP: 'whatsapp',
  PAYMENT: 'payment',
  STATUS: 'status',
  CONTACT_UPDATED: 'contact',
};

export type LeadWithRelations = Lead & {
  contact: Contact;
  plot?: Pick<Plot, 'id' | 'title' | 'status' | 'priceKes' | 'sizePreset'> | null;
  sale?: Pick<SaleRecord, 'id' | 'titleStatus' | 'agreedPriceKes'> | null;
  activities?: { id: string; type: string; body: string | null; createdAt: Date }[];
};

/** Decimal-safe JSON for leads, their buyer, and any attached plot. */
export function leadJson(lead: LeadWithRelations) {
  const { contact, plot, sale, activities, budgetMinKes, budgetMaxKes, ...rest } = lead;

  return {
    ...rest,
    budgetMinKes: serializeMoney(budgetMinKes),
    budgetMaxKes: serializeMoney(budgetMaxKes),
    contact,
    ...(plot !== undefined
      ? {
          plot: plot ? { ...plot, priceKes: serializeMoney(plot.priceKes) } : null,
        }
      : {}),
    ...(sale !== undefined
      ? {
          sale: sale
            ? { ...sale, agreedPriceKes: serializeMoney(sale.agreedPriceKes) }
            : null,
        }
      : {}),
    ...(activities !== undefined ? { activities } : {}),
  };
}
