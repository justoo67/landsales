import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { syncLeadNextAction, taskJson } from '@/lib/tasks';
import { isTaskType, TASK_PRIORITIES } from '@/lib/task-types';

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

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    let activity: { type: string; body: string } | null = null;

    if (typeof body.title === 'string' && body.title.trim()) {
      data.title = body.title.trim().slice(0, 200);
    }

    if (body.type !== undefined && isTaskType(body.type)) {
      data.type = body.type;
    }

    if (body.priority !== undefined && TASK_PRIORITIES.includes(body.priority)) {
      data.priority = body.priority;
    }

    if (body.notes !== undefined) {
      data.notes = body.notes ? String(body.notes).slice(0, 2000) : null;
    }

    if (body.dueAt !== undefined) {
      const dueAt = body.dueAt ? new Date(body.dueAt) : null;
      if (!dueAt || Number.isNaN(dueAt.getTime())) {
        return NextResponse.json({ error: 'Invalid due date' }, { status: 400 });
      }
      data.dueAt = dueAt;
    }

    if (body.done !== undefined) {
      if (body.done && !existing.doneAt) {
        data.doneAt = new Date();
        activity = { type: 'STATUS', body: `Completed: ${existing.title}` };
      } else if (!body.done && existing.doneAt) {
        data.doneAt = null;
        activity = { type: 'STATUS', body: `Reopened: ${existing.title}` };
      }
    }

    const task = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id },
        data,
        include: taskInclude,
      });

      if (activity) {
        await logActivity(
          {
            type: activity.type,
            body: activity.body,
            leadId: existing.leadId,
            contactId: existing.contactId,
            plotId: existing.plotId,
          },
          tx
        );
      }

      await syncLeadNextAction(existing.leadId, tx);
      return updated;
    });

    return NextResponse.json({ task: taskJson(task) });
  } catch (err) {
    console.error('Update task error:', err);
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

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.task.delete({ where: { id } });
      await syncLeadNextAction(existing.leadId, tx);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete task error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
