import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAgent } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { requestMoney } from '@/lib/money.server';
import { leadJson, LEAD_SOURCES } from '@/lib/leads';

const detailInclude = {
  contact: true,
  plot: {
    select: { id: true, title: true, status: true, priceKes: true, sizePreset: true },
  },
  sale: { select: { id: true, titleStatus: true, agreedPriceKes: true } },
  activities: { orderBy: { createdAt: 'desc' as const }, take: 60 },
} as const;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAgent();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const lead = await prisma.lead.findFirst({
      where: { id, agentId: auth.agentId },
      include: detailInclude,
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead: leadJson(lead) });
  } catch (err) {
    console.error('Fetch lead error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAgent();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.lead.findFirst({
      where: { id, agentId: auth.agentId },
      select: { id: true, contactId: true, plotId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.plotId !== undefined) {
      if (body.plotId === null || body.plotId === '') {
        data.plotId = null;
      } else {
        const plot = await prisma.plot.findFirst({
          where: { id: String(body.plotId), deletedAt: null, agentId: auth.agentId },
          select: { id: true },
        });
        if (!plot) {
          return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
        }
        data.plotId = plot.id;
      }
    }

    if (body.source !== undefined && LEAD_SOURCES.includes(body.source)) {
      data.source = body.source;
    }

    if (body.budgetMinKes !== undefined) {
      try {
        data.budgetMinKes = requestMoney(body.budgetMinKes);
      } catch {
        return NextResponse.json({ error: 'Invalid budget' }, { status: 400 });
      }
    }

    if (body.budgetMaxKes !== undefined) {
      try {
        data.budgetMaxKes = requestMoney(body.budgetMaxKes);
      } catch {
        return NextResponse.json({ error: 'Invalid budget' }, { status: 400 });
      }
    }

    if (body.nextActionAt !== undefined) {
      data.nextActionAt = body.nextActionAt ? new Date(body.nextActionAt) : null;
    }

    const lead = await prisma.lead.update({
      where: { id },
      data,
      include: detailInclude,
    });

    if (data.plotId !== undefined && data.plotId !== existing.plotId) {
      await logActivity({
        agentId: auth.agentId,
        type: 'STAGE_CHANGED',
        body: 'Linked plot updated',
        leadId: lead.id,
        contactId: existing.contactId,
        plotId: (data.plotId as string | null) ?? undefined,
        metadata: { from: existing.plotId, to: data.plotId },
      });
    }

    return NextResponse.json({ lead: leadJson(lead) });
  } catch (err) {
    console.error('Update lead error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAgent();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const deleted = await prisma.lead.deleteMany({
      where: { id, agentId: auth.agentId },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete lead error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
