import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export interface ActivityInput {
  type: string;
  body?: string | null;
  metadata?: Prisma.InputJsonValue;
  contactId?: string | null;
  leadId?: string | null;
  plotId?: string | null;
  saleId?: string | null;
}

type Client = Prisma.TransactionClient | typeof prisma;

/**
 * Append one timeline event. Every meaningful mutation should call this so the
 * agent can reconstruct what happened without a separate notes table.
 */
export async function logActivity(input: ActivityInput, client: Client = prisma) {
  return client.activity.create({
    data: {
      type: input.type,
      body: input.body ?? null,
      metadata: input.metadata,
      contactId: input.contactId ?? null,
      leadId: input.leadId ?? null,
      plotId: input.plotId ?? null,
      saleId: input.saleId ?? null,
    },
  });
}
