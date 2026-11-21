import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAgent } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { syncLeadNextAction, taskJson } from '@/lib/tasks';
import { isTaskType, TASK_PRIORITIES, taskTypeLabel } from '@/lib/task-types';

const taskInclude = {
  lead: {
    select: {
      id: true,
      stage: true,
      contact: { select: { id: true, name: true, phone: true } },
      plot: { select: { id: true, title: true } },
    },
  },
  plot: { select: { id: true, title: true } },
} as const;

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfToday() {
  const start = startOfToday();
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export async function GET(req: Request) {
  try {
    const auth = await requireAgent();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || 'open';

    const tasks = await prisma.task.findMany({
      where: {
        agentId: auth.agentId,
        ...(scope === 'all' ? {} : { doneAt: null }),
      },
      include: taskInclude,
      orderBy: [{ doneAt: 'asc' }, { dueAt: 'asc' }],
      take: 200,
    });

    const open = tasks.filter((task) => !task.doneAt);
    const dayStart = startOfToday().getTime();
    const dayEnd = endOfToday().getTime();

    const summary = {
      open: open.length,
      overdue: open.filter((task) => task.dueAt.getTime() < dayStart).length,
      today: open.filter(
        (task) => task.dueAt.getTime() >= dayStart && task.dueAt.getTime() < dayEnd
      ).length,
      upcoming: open.filter((task) => task.dueAt.getTime() >= dayEnd).length,
    };

    return NextResponse.json({ tasks: tasks.map(taskJson), summary });
  } catch (err) {
    console.error('Fetch tasks error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAgent();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const type = isTaskType(body.type) ? body.type : 'FOLLOW_UP';
    const priority = TASK_PRIORITIES.includes(body.priority) ? body.priority : 'NORMAL';
    const dueAtRaw = body.dueAt;

    if (!title) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const dueAt = dueAtRaw ? new Date(dueAtRaw) : null;
    if (!dueAt || Number.isNaN(dueAt.getTime())) {
      return NextResponse.json({ error: 'A valid due date is required' }, { status: 400 });
    }

    let leadId: string | null = null;
    let contactId: string | null = null;
    let plotId: string | null = null;

    if (typeof body.leadId === 'string' && body.leadId.trim()) {
      const lead = await prisma.lead.findFirst({
        where: { id: body.leadId.trim(), agentId: auth.agentId },
        select: { id: true, contactId: true, plotId: true },
      });
      if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }
      leadId = lead.id;
      contactId = lead.contactId;
      plotId = lead.plotId;
    }

    if (typeof body.plotId === 'string' && body.plotId.trim()) {
      const plot = await prisma.plot.findFirst({
        where: { id: body.plotId.trim(), deletedAt: null, agentId: auth.agentId },
        select: { id: true },
      });
      if (!plot) {
        return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
      }
      plotId = plot.id;
    }

    if (typeof body.contactId === 'string' && body.contactId.trim()) {
      const contact = await prisma.contact.findFirst({
        where: { id: body.contactId.trim(), agentId: auth.agentId },
        select: { id: true },
      });
      if (!contact) {
        return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
      }
      contactId = contact.id;
    }

    let saleId: string | null = null;
    if (typeof body.saleId === 'string' && body.saleId.trim()) {
      const sale = await prisma.saleRecord.findFirst({
        where: { id: body.saleId.trim(), plot: { agentId: auth.agentId } },
        select: { id: true },
      });
      if (!sale) {
        return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
      }
      saleId = sale.id;
    }

    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          agentId: auth.agentId,
          title: title.slice(0, 200),
          type,
          priority,
          dueAt,
          notes: body.notes ? String(body.notes).slice(0, 2000) : null,
          leadId,
          contactId,
          plotId,
          saleId,
        },
        include: taskInclude,
      });

      await logActivity(
        {
          agentId: auth.agentId,
          type: 'TASK_CREATED',
          body: `${taskTypeLabel(type)}: ${created.title}`,
          leadId,
          contactId,
          plotId,
        },
        tx
      );

      await syncLeadNextAction(leadId, tx);
      return created;
    });

    return NextResponse.json({ task: taskJson(task) }, { status: 201 });
  } catch (err) {
    console.error('Create task error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
