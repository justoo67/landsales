import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAgent } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { normalizePhone } from '@/lib/phone';

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
    const contact = await prisma.contact.findFirst({
      where: { id, agentId: auth.agentId },
      include: {
        leads: {
          include: {
            plot: { select: { id: true, title: true, status: true } },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (err) {
    console.error('Fetch contact error:', err);
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

    const existing = await prisma.contact.findFirst({
      where: { id, agentId: auth.agentId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    const changed: string[] = [];

    if (typeof body.name === 'string' && body.name.trim()) {
      data.name = body.name.trim().slice(0, 120);
      changed.push('name');
    }

    if (body.phone !== undefined) {
      const phone = normalizePhone(String(body.phone));
      if (!phone) {
        return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
      }
      if (phone !== existing.phone) {
        const clash = await prisma.contact.findFirst({
          where: { phone, agentId: auth.agentId },
        });
        if (clash) {
          return NextResponse.json(
            {
              error: 'Another buyer already uses this number',
              code: 'PHONE_IN_USE',
              contactId: clash.id,
            },
            { status: 409 }
          );
        }
        data.phone = phone;
        changed.push('phone');
      }
    }

    if (body.altPhone !== undefined) {
      data.altPhone = body.altPhone ? normalizePhone(String(body.altPhone)) : null;
      changed.push('altPhone');
    }

    if (body.email !== undefined) {
      data.email = body.email ? String(body.email).trim().slice(0, 200) : null;
      changed.push('email');
    }

    if (Array.isArray(body.tags)) {
      data.tags = body.tags
        .filter((tag: unknown) => typeof tag === 'string')
        .map((tag: string) => tag.trim())
        .filter(Boolean)
        .slice(0, 12);
      changed.push('tags');
    }

    if (body.notes !== undefined) {
      data.notes = body.notes ? String(body.notes).slice(0, 4000) : null;
      changed.push('notes');
    }

    const contact = await prisma.contact.update({ where: { id }, data });

    if (changed.length > 0) {
      await logActivity({
        agentId: auth.agentId,
        type: 'CONTACT_UPDATED',
        body: `Buyer details updated (${changed.join(', ')})`,
        contactId: contact.id,
        metadata: { fields: changed },
      });
    }

    return NextResponse.json({ contact });
  } catch (err) {
    console.error('Update contact error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
