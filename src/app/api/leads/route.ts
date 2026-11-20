import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { normalizePhone } from '@/lib/phone';
import { requestMoney } from '@/lib/money.server';
import { leadJson, LEAD_SOURCES, stageOrder } from '@/lib/leads';

const leadInclude = {
  contact: true,
  plot: {
    select: { id: true, title: true, status: true, priceKes: true, sizePreset: true },
  },
  sale: { select: { id: true, titleStatus: true, agreedPriceKes: true } },
} as const;

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage');
    const query = searchParams.get('query')?.trim();

    const where: Record<string, unknown> = {};

    if (stage && stage !== 'ALL') {
      where.stage = stage;
    }

    if (query) {
      where.OR = [
        { contact: { name: { contains: query, mode: 'insensitive' } } },
        { contact: { phone: { contains: query } } },
        { plot: { title: { contains: query, mode: 'insensitive' } } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: leadInclude,
      orderBy: { updatedAt: 'desc' },
    });

    const sorted = [...leads].sort((a, b) => {
      const byStage = stageOrder(a.stage) - stageOrder(b.stage);
      if (byStage !== 0) return byStage;
      if (a.index !== b.index) return a.index - b.index;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    return NextResponse.json({ leads: sorted.map(leadJson) });
  } catch (err) {
    console.error('Fetch leads error:', err);
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
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const phone = rawPhone ? normalizePhone(rawPhone) : null;
    const source = LEAD_SOURCES.includes(body.source) ? body.source : 'FIELD';

    if (!name) {
      return NextResponse.json({ error: 'Buyer name is required' }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json(
        { error: 'A valid phone number is required' },
        { status: 400 }
      );
    }

    let budgetMinKes;
    let budgetMaxKes;
    try {
      budgetMinKes = requestMoney(body.budgetMinKes);
      budgetMaxKes = requestMoney(body.budgetMaxKes);
    } catch {
      return NextResponse.json({ error: 'Invalid budget amount' }, { status: 400 });
    }

    let plotId: string | null = null;
    if (typeof body.plotId === 'string' && body.plotId.trim()) {
      const plot = await prisma.plot.findFirst({
        where: { id: body.plotId.trim(), deletedAt: null },
        select: { id: true },
      });
      if (!plot) {
        return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
      }
      plotId = plot.id;
    }

    const lead = await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.upsert({
        where: { phone },
        update: { name },
        create: { name, phone, source },
      });

      const index = await tx.lead.count({ where: { stage: 'INQUIRY' } });

      const created = await tx.lead.create({
        data: {
          contactId: contact.id,
          plotId,
          stage: 'INQUIRY',
          index,
          source,
          budgetMinKes,
          budgetMaxKes,
          nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : null,
        },
        include: leadInclude,
      });

      await logActivity(
        {
          type: 'LEAD_CREATED',
          body: `Lead added${plotId ? ' for a plot' : ''}`,
          leadId: created.id,
          contactId: contact.id,
          plotId,
        },
        tx
      );

      return created;
    });

    return NextResponse.json({ lead: leadJson(lead) }, { status: 201 });
  } catch (err) {
    console.error('Create lead error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
