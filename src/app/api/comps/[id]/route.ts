import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requestMoney } from '@/lib/money.server';
import { compJson } from '@/lib/comps';

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

    const existing = await prisma.comparable.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Comparable not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (typeof body.county === 'string' && body.county.trim()) {
      data.county = body.county.trim().slice(0, 120);
    }
    if (body.ward !== undefined) {
      data.ward = body.ward ? String(body.ward).trim().slice(0, 120) : null;
    }
    if (typeof body.locationName === 'string' && body.locationName.trim()) {
      data.locationName = body.locationName.trim().slice(0, 160);
    }
    if (body.kind === 'SALE' || body.kind === 'LISTING') {
      data.kind = body.kind;
    }
    if (body.source !== undefined) {
      data.source = body.source;
    }
    if (body.sourceUrl !== undefined) {
      data.sourceUrl = body.sourceUrl ? String(body.sourceUrl).slice(0, 500) : null;
    }
    if (body.verified !== undefined) {
      data.verified = Boolean(body.verified);
    }
    if (body.notes !== undefined) {
      data.notes = body.notes ? String(body.notes).slice(0, 2000) : null;
    }
    if (body.observedAt !== undefined) {
      const observedAt = body.observedAt ? new Date(body.observedAt) : null;
      if (!observedAt || Number.isNaN(observedAt.getTime())) {
        return NextResponse.json({ error: 'Invalid observation date' }, { status: 400 });
      }
      data.observedAt = observedAt;
    }

    const nextSize = body.sizeAcres !== undefined ? Number(body.sizeAcres) : Number(existing.sizeAcres);
    if (!Number.isFinite(nextSize) || nextSize <= 0) {
      return NextResponse.json({ error: 'Invalid size' }, { status: 400 });
    }
    data.sizeAcres = nextSize.toFixed(4);

    let nextPrice = existing.priceKes;
    if (body.priceKes !== undefined) {
      try {
        const parsed = requestMoney(body.priceKes);
        if (!parsed || parsed.lte(0)) throw new RangeError('bad price');
        nextPrice = parsed;
      } catch {
        return NextResponse.json({ error: 'Invalid price amount' }, { status: 400 });
      }
      data.priceKes = nextPrice;
    }

    // Size and price both feed the stored per-acre figure.
    data.pricePerAcre = nextPrice.div(nextSize.toString()).toFixed(2);

    const comp = await prisma.comparable.update({ where: { id }, data });
    return NextResponse.json({ comp: compJson(comp) });
  } catch (err) {
    console.error('Update comp error:', err);
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
    await prisma.comparable.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete comp error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
