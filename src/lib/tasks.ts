import type { Prisma, Task } from '@prisma/client';
import { prisma } from './prisma';

export * from './task-types';

export type TaskWithRelations = Task & {
  lead?: {
    id: string;
    stage: string;
    contact: { id: string; name: string; phone: string };
    plot?: { id: string; title: string } | null;
  } | null;
  plot?: { id: string; title: string } | null;
};

type Client = Prisma.TransactionClient | typeof prisma;

/**
 * Mirror the earliest open task onto `Lead.nextActionAt`.
 *
 * The lead list and the "can I advance this stage?" rule both read this field,
 * so it must never drift from the tasks table.
 */
export async function syncLeadNextAction(leadId: string | null | undefined, client: Client = prisma) {
  if (!leadId) return null;

  const next = await client.task.findFirst({
    where: { leadId, doneAt: null },
    orderBy: { dueAt: 'asc' },
    select: { dueAt: true },
  });

  return client.lead.update({
    where: { id: leadId },
    data: { nextActionAt: next?.dueAt ?? null },
    select: { id: true, nextActionAt: true },
  });
}

export function taskJson(task: TaskWithRelations) {
  return { ...task };
}
