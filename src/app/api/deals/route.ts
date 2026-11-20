import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { saleRecordJson } from '@/lib/serialize';
import {
  serializeMoney,
  subtractFloorZero,
  sumDecimals,
} from '@/lib/money.server';

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

    const totalSoldVolume = sumDecimals(deals.map((d) => d.agreedPriceKes));
    const totalCollected = sumDecimals(
      deals.flatMap((d) => d.installments.map((i) => i.amountKes))
    );
    const totalOutstanding = subtractFloorZero(totalSoldVolume, totalCollected);

    return NextResponse.json({
      deals: deals.map((deal) => ({
        ...saleRecordJson(deal),
        plot: deal.plot
          ? { ...deal.plot, priceKes: serializeMoney(deal.plot.priceKes) }
          : null,
      })),
      metrics: {
        totalDeals: deals.length,
        totalSoldVolume: serializeMoney(totalSoldVolume) ?? 0,
        totalCollected: serializeMoney(totalCollected) ?? 0,
        totalOutstanding: serializeMoney(totalOutstanding) ?? 0,
      },
    });
  } catch (err) {
    console.error('Fetch all deals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
