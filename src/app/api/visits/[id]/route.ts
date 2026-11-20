import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { syncLeadNextAction } from '@/lib/tasks';
import { isVisitStatus, VISIT_STATUS_LABELS, type VisitStatus } from '@/lib/visits';

const visitInclude = {
  lead: {
    select: {
      id: true,
      stage: true,
      contact: { select: { id: true, name: true, phone: true } },
    },
  },
  plot: { select: { id: true, title: true } },
} as const;

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

    const existing = await prisma.siteVisit.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.scheduledAt !== undefined) {
      const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
      if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
        return NextResponse.json({ error: 'Invalid visit date' }, { status: 400 });
      }
      data.scheduledAt = scheduledAt;
    }

    if (body.feedback !== undefined) {
      data.feedback = body.feedback ? String(body.feedback).slice(0, 2000) : null;
    }

    if (body.rating !== undefined) {
      const rating = Number(body.rating);
      data.rating = Number.isFinite(rating) && rating >= 1 && rating <= 5 ? Math.round(rating) : null;
    }

    let nextStatus: VisitStatus | undefined;
    if (body.status !== undefined) {
      if (!isVisitStatus(body.status)) {
        return NextResponse.json({ error: 'Unknown visit status' }, { status: 400 });
      }
      nextStatus = body.status;
      data.status = nextStatus;
    }

    const visit = await prisma.$transaction(async (tx) => {
      const updated = await tx.siteVisit.update({
        where: { id },
        data,
        include: visitInclude,
      });

      // Closing a visit closes its reminder task.
      const closing =
        nextStatus !== undefined &&
        nextStatus !== 'SCHEDULED' &&
        existing.status === 'SCHEDULED' &&
        existing.taskId;

      if (closing) {
        await tx.task.updateMany({
          where: { id: existing.taskId as string, doneAt: null },
          data: { doneAt: new Date() },
        });
      }

      if (nextStatus !== undefined && nextStatus !== existing.status) {
        const detail =
          nextStatus === 'COMPLETED'
            ? 'Site visit completed'
            : `Site visit marked ${VISIT_STATUS_LABELS[nextStatus].toLowerCase()}`;

        await logActivity(
          {
            type: 'SITE_VISIT',
            body: detail,
            leadId: existing.leadId,
            plotId: existing.plotId,
            metadata: {
              status: nextStatus,
              rating: data.rating ?? existing.rating,
              feedback: data.feedback ?? existing.feedback,
            },
          },
          tx
        );
      }

      await syncLeadNextAction(existing.leadId, tx);
      return updated;
    });

    return NextResponse.json({ visit });
  } catch (err) {
    console.error('Update visit error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.siteVisit.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.siteVisit.delete({ where: { id } });
      if (existing.taskId) {
        await tx.task.deleteMany({ where: { id: existing.taskId, doneAt: null } });
      }
      await syncLeadNextAction(existing.leadId, tx);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete visit error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
