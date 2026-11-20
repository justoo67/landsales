import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { syncLeadNextAction } from '@/lib/tasks';
import { isVisitStatus } from '@/lib/visits';

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

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const status = searchParams.get('status');
    const leadId = searchParams.get('leadId');

    const from = fromParam ? new Date(fromParam) : startOfToday();
    const to = toParam ? new Date(toParam) : new Date(from.getTime() + 7 * 86_400_000);

    const where: Record<string, unknown> = {};

    if (leadId) {
      where.leadId = leadId;
    } else {
      where.scheduledAt = { gte: from, lt: to };
    }

    if (status && isVisitStatus(status)) {
      where.status = status;
    }

    const visits = await prisma.siteVisit.findMany({
      where,
      include: visitInclude,
      orderBy: { scheduledAt: 'asc' },
    });

    return NextResponse.json({ visits });
  } catch (err) {
    console.error('Fetch visits error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : '';
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;

    if (!leadId) {
      return NextResponse.json({ error: 'A lead is required' }, { status: 400 });
    }

    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: 'A valid visit date is required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        contact: { select: { name: true } },
        plot: { select: { id: true, title: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const visit = await tx.siteVisit.create({
        data: {
          leadId: lead.id,
          plotId: lead.plotId,
          scheduledAt,
        },
        include: visitInclude,
      });

      const task = await tx.task.create({
        data: {
          title: `Site visit: ${lead.contact.name}${
            lead.plot ? ` · ${lead.plot.title}` : ''
          }`,
          type: 'SITE_VISIT',
          dueAt: scheduledAt,
          leadId: lead.id,
          contactId: lead.contactId,
          plotId: lead.plotId,
        },
      });

      await tx.siteVisit.update({
        where: { id: visit.id },
        data: { taskId: task.id },
      });

      await logActivity(
        {
          type: 'SITE_VISIT',
          body: `Site visit scheduled for ${scheduledAt.toLocaleString('en-KE')}`,
          leadId: lead.id,
          contactId: lead.contactId,
          plotId: lead.plotId,
        },
        tx
      );

      await syncLeadNextAction(lead.id, tx);

      return { visit: { ...visit, taskId: task.id }, task };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error('Create visit error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
