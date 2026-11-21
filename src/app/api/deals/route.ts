import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAgent } from '@/lib/auth';
import { saleRecordJson } from '@/lib/serialize';
import {
  serializeMoney,
  subtractFloorZero,
  sumDecimals,
} from '@/lib/money.server';
import { commissionTotals, receivablesAging } from '@/lib/finance';

export async function GET() {
  try {
    const auth = await requireAgent();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deals = await prisma.saleRecord.findMany({
      where: { plot: { agentId: auth.agentId } },
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
        commission: true,
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
      finance: {
        receivables: receivablesAging(deals),
        commission: commissionTotals(
          deals.map((deal) => deal.commission).filter((item): item is NonNullable<typeof item> => Boolean(item))
        ),
      },
    });
  } catch (err) {
    console.error('Fetch all deals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
