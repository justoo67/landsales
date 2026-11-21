import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAgent } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { D, serializeMoney } from '@/lib/money.server';
import {
  COMMISSION_BASES,
  COMMISSION_STATUSES,
  commissionJson,
} from '@/lib/finance';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAgent();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: plotId } = await params;
    const sale = await prisma.saleRecord.findFirst({
      where: { plotId, plot: { agentId: auth.agentId } },
      include: { commission: true },
    });

    if (!sale) {
      return NextResponse.json({ error: 'No sale record for this plot' }, { status: 404 });
    }

    return NextResponse.json({ commission: commissionJson(sale.commission) });
  } catch (err) {
    console.error('Fetch commission error:', err);
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

    const { id: plotId } = await params;
    const body = await req.json();

    const sale = await prisma.saleRecord.findFirst({
      where: { plotId, plot: { agentId: auth.agentId } },
      include: { commission: true },
    });

    if (!sale) {
      return NextResponse.json({ error: 'No sale record for this plot' }, { status: 404 });
    }

    const basis = COMMISSION_BASES.includes(body.basis) ? body.basis : 'PERCENT';
    const ratePercent =
      body.ratePercent === '' || body.ratePercent === null || body.ratePercent === undefined
        ? null
        : Number(body.ratePercent);

    if (basis === 'PERCENT') {
      if (!ratePercent || !Number.isFinite(ratePercent) || ratePercent <= 0 || ratePercent > 100) {
        return NextResponse.json(
          { error: 'Enter a commission percentage between 0 and 100' },
          { status: 400 }
        );
      }
    }

    const status = COMMISSION_STATUSES.includes(body.status) ? body.status : 'PENDING';

    const amount =
      basis === 'PERCENT'
        ? sale.agreedPriceKes.mul(new D(ratePercent as number)).div(100).toDecimalPlaces(2)
        : new D(String(body.amountKes ?? 0)).toDecimalPlaces(2);

    if (amount.lte(0)) {
      return NextResponse.json({ error: 'Commission amount must be greater than zero' }, { status: 400 });
    }

    const dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.dueDate && (!dueDate || Number.isNaN(dueDate.getTime()))) {
      return NextResponse.json({ error: 'Invalid commission due date' }, { status: 400 });
    }

    const commission = await prisma.commission.upsert({
      where: { saleId: sale.id },
      update: {
        basis,
        ratePercent: basis === 'PERCENT' ? ratePercent : null,
        amountKes: amount,
        status,
        dueDate,
        paidAt: status === 'PAID' ? sale.commission?.paidAt ?? new Date() : null,
        notes: body.notes ? String(body.notes).slice(0, 1000) : null,
      },
      create: {
        saleId: sale.id,
        basis,
        ratePercent: basis === 'PERCENT' ? ratePercent : null,
        amountKes: amount,
        status,
        dueDate,
        paidAt: status === 'PAID' ? new Date() : null,
        notes: body.notes ? String(body.notes).slice(0, 1000) : null,
      },
    });

    await logActivity({
      agentId: auth.agentId,
      type: 'PAYMENT',
      body:
        status === 'PAID'
          ? `Commission marked paid (${serializeMoney(amount)?.toLocaleString('en-KE')} KES)`
          : `Commission set to ${status.toLowerCase()} (${serializeMoney(amount)?.toLocaleString('en-KE')} KES)`,
      plotId,
      saleId: sale.id,
      metadata: { commissionId: commission.id, status, basis },
    });

    return NextResponse.json({ commission: commissionJson(commission) });
  } catch (err) {
    console.error('Update commission error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
