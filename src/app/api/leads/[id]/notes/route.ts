import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

const NOTE_TYPES = ['NOTE', 'CALL', 'WHATSAPP', 'STATUS'] as const;

export async function POST(
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
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    const type = NOTE_TYPES.includes(body.type) ? body.type : 'NOTE';

    if (!text) {
      return NextResponse.json({ error: 'Note text is required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { id: true, contactId: true, plotId: true },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const activity = await logActivity({
      type,
      body: text.slice(0, 4000),
      leadId: lead.id,
      contactId: lead.contactId,
      plotId: lead.plotId,
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (err) {
    console.error('Create lead note error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
