import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { leadJson, validateStageTransition, stageLabel, stageOrder } from '@/lib/leads';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const stage = typeof body.stage === 'string' ? body.stage : '';
    const lostReason =
      typeof body.lostReason === 'string' ? body.lostReason.trim() : null;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        plot: {
          select: { id: true, saleRecord: { select: { id: true } } },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Moving forward without a next action is how leads go cold.
    const movingForward =
      stageOrder(stage) > stageOrder(lead.stage) && stage !== 'LOST' && stage !== 'CLOSED';

    if (movingForward && !lead.nextActionAt) {
      const openTask = await prisma.task.findFirst({
        where: { leadId: id, doneAt: null },
        select: { id: true },
      });

      if (!openTask) {
        return NextResponse.json(
          {
            error: 'Schedule your next follow-up before moving this lead forward',
            code: 'NEXT_ACTION_REQUIRED',
          },
          { status: 409 }
        );
      }
    }

    const saleRecordId = lead.plot?.saleRecord?.id ?? null;

    const validation = validateStageTransition({
      to: stage,
      lostReason,
      hasSaleRecord: Boolean(saleRecordId),
    });

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error, code: validation.code },
        { status: 409 }
      );
    }

    const lastInStage = await prisma.lead.findFirst({
      where: { stage },
      orderBy: { index: 'desc' },
      select: { index: true },
    });

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        stage,
        index: (lastInStage?.index ?? -1) + 1,
        lostReason: stage === 'LOST' ? lostReason : null,
        ...(stage === 'CLOSED' && saleRecordId ? { saleId: saleRecordId } : {}),
      },
      include: {
        contact: true,
        plot: {
          select: { id: true, title: true, status: true, priceKes: true, sizePreset: true },
        },
        sale: { select: { id: true, titleStatus: true, agreedPriceKes: true } },
      },
    });

    await logActivity({
      type: 'STAGE_CHANGED',
      body: `Moved from ${stageLabel(lead.stage)} to ${stageLabel(stage)}${
        stage === 'LOST' && lostReason ? ` — ${lostReason}` : ''
      }`,
      leadId: lead.id,
      contactId: lead.contactId,
      plotId: lead.plotId,
      saleId: updated.saleId,
      metadata: { from: lead.stage, to: stage, lostReason },
    });

    return NextResponse.json({ lead: leadJson(updated) });
  } catch (err) {
    console.error('Update lead stage error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
