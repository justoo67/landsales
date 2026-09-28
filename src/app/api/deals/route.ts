import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deals = await prisma.saleRecord.findMany({
      include: {
        plot: {
          select: {
            id: true,
            title: true,
            status: true,
            sizePreset: true,
            priceKes: true,
          },
        },
        installments: {
          orderBy: { paymentDate: 'desc' },
        },
        review: true,
      },
      orderBy: { closedAt: 'desc' },
    });

    const totalSoldVolume = deals.reduce((sum, d) => sum + d.agreedPriceKes, 0);
    const totalCollected = deals.reduce((sum, d) => {
      const paid = d.installments.reduce((acc, inst) => acc + inst.amountKes, 0);
      return sum + paid;
    }, 0);
    const totalOutstanding = Math.max(0, totalSoldVolume - totalCollected);

    return NextResponse.json({
      deals,
      metrics: {
        totalDeals: deals.length,
        totalSoldVolume,
        totalCollected,
        totalOutstanding,
      },
    });
  } catch (err) {
    console.error('Fetch all deals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
