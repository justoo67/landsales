/**
 * One-off backfill: existing sale records become buyers (Contact) with a
 * CLOSED lead, so the pipeline starts with a complete history.
 *
 * Idempotent: sales that already have a lead are skipped.
 *
 *   node scripts/backfill-leads.mts
 */
import { PrismaClient } from '@prisma/client';
import { normalizePhone } from '../src/lib/phone.ts';

const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.saleRecord.findMany({
    where: { lead: { is: null } },
    include: { plot: { select: { id: true, title: true, agentId: true } } },
  });

  if (sales.length === 0) {
    console.log('No sale records need backfilling.');
    return;
  }

  let created = 0;

  for (const sale of sales) {
    const phone = normalizePhone(sale.buyerPhone) ?? sale.buyerPhone.trim();
    const agentId = sale.plot?.agentId;
    if (!agentId) {
      console.warn(`Skipping ${sale.buyerName}: sale plot is not owned by an agent.`);
      continue;
    }

    const contact = await prisma.contact.upsert({
      where: { agentId_phone: { agentId, phone } },
      update: {},
      create: {
        agentId,
        name: sale.buyerName,
        phone,
        source: 'FIELD',
        notes: sale.buyerNationalId ? `National ID: ${sale.buyerNationalId}` : null,
      },
    });

    await prisma.lead.create({
      data: {
        agentId,
        contactId: contact.id,
        plotId: sale.plotId,
        stage: 'CLOSED',
        source: 'FIELD',
        saleId: sale.id,
        nextActionAt: null,
      },
    });

    await prisma.activity.create({
      data: {
        agentId,
        type: 'LEAD_CREATED',
        body: `Imported from the sale record for ${sale.plot?.title ?? 'a plot'}`,
        contactId: contact.id,
        plotId: sale.plotId,
        saleId: sale.id,
      },
    });

    created += 1;
    console.log(`Linked ${sale.buyerName} -> ${sale.plot?.title ?? sale.plotId}`);
  }

  console.log(`Backfill complete: ${created} lead(s) created.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
