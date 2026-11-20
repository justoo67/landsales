import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { normalizePhone } from '@/lib/phone';
import { clientIp, rateLimit } from '@/lib/rate-limit';

/**
 * Public inquiry capture.
 *
 * Called from the shared listing page (fire-and-forget) so the agent can see
 * demand for a plot even before the buyer sends a WhatsApp message.
 *
 * Two shapes are accepted:
 *  - `{ plotId, name, phone }` -> creates a Contact + Lead (deduped per plot/24h)
 *  - `{ plotId }`              -> anonymous signal only, recorded on the plot
 */
export async function POST(req: Request) {
  try {
    const limit = rateLimit(`inquiry:${clientIp(req)}`, 20, 60 * 60 * 1000);
    if (!limit.ok) {
      // Never block the buyer's WhatsApp redirect; just stop writing rows.
      return NextResponse.json({ ok: true, throttled: true });
    }

    const body = await req.json().catch(() => ({}));
    const plotId = typeof body.plotId === 'string' ? body.plotId.trim() : '';

    if (!plotId) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const plot = await prisma.plot.findFirst({
      where: { id: plotId, deletedAt: null },
      select: { id: true, title: true, status: true },
    });

    if (!plot) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const rawName = typeof body.name === 'string' ? body.name.trim() : '';
    const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const phone = rawPhone ? normalizePhone(rawPhone) : null;
    const name = rawName.slice(0, 120);

    // Anonymous tap: still useful signal, no junk contact.
    if (!name || !phone) {
      await logActivity({
        type: 'INQUIRY',
        body: `Listing link opened for ${plot.title}`,
        plotId: plot.id,
        metadata: { anonymous: true },
      });
      return NextResponse.json({ ok: true, anonymous: true });
    }

    const result = await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.upsert({
        where: { phone },
        update: { name },
        create: { name, phone, source: 'INQUIRY' },
      });

      const recentLead = await tx.lead.findFirst({
        where: {
          contactId: contact.id,
          plotId: plot.id,
          stage: { notIn: ['LOST', 'CLOSED'] },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (recentLead) {
        await logActivity(
          {
            type: 'INQUIRY',
            body: `Repeat inquiry on ${plot.title}`,
            leadId: recentLead.id,
            contactId: contact.id,
            plotId: plot.id,
          },
          tx
        );
        return { leadId: recentLead.id, repeat: true };
      }

      const lead = await tx.lead.create({
        data: {
          contactId: contact.id,
          plotId: plot.id,
          stage: 'INQUIRY',
          index: 0,
          source: 'INQUIRY',
        },
      });

      await logActivity(
        {
          type: 'INQUIRY',
          body: `Inquired about ${plot.title} from the shared link`,
          leadId: lead.id,
          contactId: contact.id,
          plotId: plot.id,
        },
        tx
      );

      return { leadId: lead.id, repeat: false };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('Inquiry capture error:', err);
    // Public endpoint: fail soft so the buyer still reaches WhatsApp.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
