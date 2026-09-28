import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const VALID_STAGES = [
  'DEPOSIT_PAID',
  'AGREEMENT_SIGNED',
  'BALANCE_CLEARED',
  'LCB_CONSENT',
  'TITLE_ISSUED',
];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: plotId } = await params;
    const body = await req.json();
    const { titleStatus } = body;

    if (!titleStatus || !VALID_STAGES.includes(titleStatus)) {
      return NextResponse.json(
        { error: 'Valid titleStatus stage is required' },
        { status: 400 }
      );
    }

    const deal = await prisma.saleRecord.findUnique({
      where: { plotId },
    });

    if (!deal) {
      return NextResponse.json(
        { error: 'No active sale record found for this plot' },
        { status: 404 }
      );
    }

    const updated = await prisma.saleRecord.update({
      where: { id: deal.id },
      data: { titleStatus },
    });

    return NextResponse.json({ success: true, deal: updated });
  } catch (err) {
    console.error('Update milestone error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
